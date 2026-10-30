import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { creatorSession, hasSupabaseEnv, partnerSession, unrelatedCreatorSession } from './supabase-setup'

/**
 * M2 (A-R7) y M3 (A-R8a/b):
 *   supabase/migrations/20261030100000_post_external_links.sql
 *   supabase/migrations/20261030110000_metrics_and_account_snapshots.sql
 *
 * Escribe en el Supabase compartido (filas de prueba con service_role), así que
 * solo corre con RUN_SOCIAL_ACCOUNTS_RLS=1 y coordinando con la otra rama.
 * Las filas de prueba llevan el handle `a-r7-test` / el título `[TEST a-r7]` y
 * se borran al terminar; si el creador demo ya tuviera filas de linkedin/x,
 * aborta sin tocar nada.
 *
 * ANTES de aplicar las migraciones deben fallar los tests de lo nuevo (las
 * tablas/columnas no existen); DESPUÉS deben pasar todos.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY
const HANDLE = 'a-r7-test'
const TITLE = '[TEST a-r7] '
const DAY = '2026-10-30'

describe.skipIf(!enabled)('vínculos externos, snapshots y métricas (M2 + M3, Supabase real)', () => {
  let admin: SupabaseClient
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let other: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let creatorId: string
  let collaborationId: string | null = null
  let accountId: string
  let otherAccountId: string
  let postA: string
  let postB: string
  let postCollab: string | null = null
  let ready = false

  async function makePost(title: string, withCollab: boolean) {
    const { data, error } = await admin
      .from('posts')
      .insert({
        creator_id: creatorId, collaboration_id: withCollab ? collaborationId : null, title: TITLE + title, content_type: 'video',
        platform: 'youtube', status: 'ready_for_review', due_date: new Date(Date.now() + 86_400_000).toISOString()
      } as never)
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: string }).id
  }

  async function cleanup() {
    if (!admin) return
    await admin.from('posts').delete().like('title', `${TITLE}%`) // en cascada: vínculos y métricas
    await admin.from('social_accounts').delete().eq('handle', HANDLE) // en cascada: snapshots
  }

  beforeAll(async () => {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    creator = await creatorSession()
    partner = await partnerSession()
    other = await unrelatedCreatorSession()
    if (!creator || !partner || !other) return

    const { data: c1 } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    const { data: c2 } = await admin.from('creators').select('id').eq('profile_id', other.userId).single()
    const { data: p1 } = await admin.from('partners').select('id').eq('profile_id', partner.userId).single()
    creatorId = (c1 as { id: string }).id
    const otherCreatorId = (c2 as { id: string }).id

    const { data: existing } = await admin.from('social_accounts').select('id').in('creator_id', [creatorId, otherCreatorId]).in('platform', ['linkedin', 'x'])
    if ((existing ?? []).length > 0) {
      console.error('[post-links-and-metrics] ya hay filas de linkedin/x en los creadores de prueba: se aborta sin tocar nada.')
      return
    }

    const { data: collab } = await admin.from('collaborations').select('id').eq('creator_id', creatorId).eq('partner_id', (p1 as { id: string }).id).limit(1).maybeSingle()
    collaborationId = (collab as { id: string } | null)?.id ?? null

    const { data: a, error: e1 } = await admin
      .from('social_accounts').insert({ creator_id: creatorId, platform: 'linkedin', handle: HANDLE, followers_count: 1, access_token_encrypted: 'a-r7-fake' } as never).select('id').single()
    const { data: b, error: e2 } = await admin
      .from('social_accounts').insert({ creator_id: otherCreatorId, platform: 'x', handle: HANDLE, followers_count: 1, access_token_encrypted: 'a-r7-fake' } as never).select('id').single()
    if (e1 || e2) {
      console.error('[post-links-and-metrics] no se pudieron crear las cuentas de prueba:', e1?.message ?? e2?.message)
      await cleanup()
      return
    }
    accountId = (a as { id: string }).id
    otherAccountId = (b as { id: string }).id
    postA = await makePost('A', false)
    postB = await makePost('B', false)
    if (collaborationId) postCollab = await makePost('colaboración', true)
    ready = true
  })

  afterAll(cleanup)

  it('precondiciones: tres sesiones y datos de prueba creados', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
    expect(other).not.toBeNull()
    expect(ready).toBe(true)
  })

  // ------------------------------------------------------------------------------------------------
  describe('M2 · post_external_links', () => {
    const link = (over: Record<string, unknown> = {}) => ({
      post_id: postA, social_account_id: accountId, platform: 'linkedin', external_id: 'ext-video-1',
      external_url: 'https://example.test/v/1', verified_at: new Date().toISOString(), ...over
    })

    it('el servidor puede insertar un vínculo válido', async () => {
      const { error } = await admin.from('post_external_links').insert(link() as never)
      expect(error).toBeNull()
    })

    it('un vínculo por publicación', async () => {
      const { error } = await admin.from('post_external_links').insert(link({ external_id: 'ext-otro' }) as never)
      expect(error).not.toBeNull()
    })

    it('el mismo contenido no se vincula a dos publicaciones de la misma cuenta', async () => {
      const { error } = await admin.from('post_external_links').insert(link({ post_id: postB }) as never)
      expect(error).not.toBeNull()
    })

    it('la plataforma no puede discrepar de la cuenta (clave compuesta)', async () => {
      const { error } = await admin.from('post_external_links').insert(link({ post_id: postB, external_id: 'ext-2', platform: 'x' }) as never)
      expect(error).not.toBeNull()
    })

    it('verified_at es obligatorio (lo fija el servidor al verificar con el proveedor)', async () => {
      const { error } = await admin.from('post_external_links').insert(link({ post_id: postB, external_id: 'ext-3', verified_at: null }) as never)
      expect(error).not.toBeNull()
    })

    it('un id externo vacío se rechaza', async () => {
      const { error } = await admin.from('post_external_links').insert(link({ post_id: postB, external_id: '' }) as never)
      expect(error).not.toBeNull()
    })

    it('el creador dueño lee su vínculo', async () => {
      const { data, error } = await creator!.client.from('post_external_links').select('external_id').eq('post_id', postA)
      expect(error).toBeNull()
      expect(data).toEqual([{ external_id: 'ext-video-1' }])
    })

    it('otro creador no lo ve', async () => {
      const { data } = await other!.client.from('post_external_links').select('external_id').eq('post_id', postA)
      expect(data ?? []).toHaveLength(0)
    })

    it('el partner lo ve solo si la publicación es de su colaboración', async () => {
      const { data: notHis } = await partner!.client.from('post_external_links').select('external_id').eq('post_id', postA)
      expect(notHis ?? []).toHaveLength(0)
      if (!postCollab) return
      await admin.from('post_external_links').insert(link({ post_id: postCollab, external_id: 'ext-collab' }) as never)
      const { data: his } = await partner!.client.from('post_external_links').select('external_id').eq('post_id', postCollab)
      expect(his).toEqual([{ external_id: 'ext-collab' }])
    })

    it.each([['creador', () => creator!], ['partner', () => partner!], ['ajeno', () => other!]])('el navegador (%s) no puede insertar, modificar ni borrar vínculos', async (_n, who) => {
      const session = who()
      const ins = await session.client.from('post_external_links').insert(link({ post_id: postB, external_id: 'forjado' }) as never)
      expect(ins.error).not.toBeNull()
      await session.client.from('post_external_links').update({ external_id: 'forjado' } as never).eq('post_id', postA)
      await session.client.from('post_external_links').delete().eq('post_id', postA)
      const { data } = await admin.from('post_external_links').select('external_id').eq('post_id', postA).single()
      expect((data as { external_id: string }).external_id).toBe('ext-video-1')
    })

    it('borrar la publicación borra su vínculo (en cascada)', async () => {
      const tmp = await makePost('cascada', false)
      await admin.from('post_external_links').insert(link({ post_id: tmp, external_id: 'ext-cascada' }) as never)
      await admin.from('posts').delete().eq('id', tmp)
      const { data } = await admin.from('post_external_links').select('id').eq('post_id', tmp)
      expect(data ?? []).toHaveLength(0)
    })
  })

  // ------------------------------------------------------------------------------------------------
  describe('M3 · social_account_snapshots', () => {
    const row = (over: Record<string, unknown> = {}) => ({ social_account_id: accountId, observed_on: DAY, followers_count: 100, views_total: 5000, videos_count: 12, ...over })

    it('el servidor guarda un snapshot y repetirlo el mismo día NO crea otra fila (idempotente)', async () => {
      const first = await admin.from('social_account_snapshots').upsert(row() as never, { onConflict: 'social_account_id,observed_on' })
      const second = await admin.from('social_account_snapshots').upsert(row({ followers_count: 101 }) as never, { onConflict: 'social_account_id,observed_on' })
      expect(first.error).toBeNull()
      expect(second.error).toBeNull()
      const { data } = await admin.from('social_account_snapshots').select('followers_count').eq('social_account_id', accountId)
      expect(data).toEqual([{ followers_count: 101 }])
    })

    it('un canal que oculta sus suscriptores guarda null, no un 0 falso', async () => {
      const { error } = await admin.from('social_account_snapshots').insert(row({ observed_on: '2026-10-29', followers_count: null, views_total: null, videos_count: null }) as never)
      expect(error).toBeNull()
      const { data } = await admin.from('social_account_snapshots').select('followers_count, views_total').eq('observed_on', '2026-10-29').eq('social_account_id', accountId).single()
      expect(data).toEqual({ followers_count: null, views_total: null })
    })

    it('los valores negativos se rechazan', async () => {
      for (const over of [{ followers_count: -1 }, { views_total: -1 }, { videos_count: -1 }]) {
        const { error } = await admin.from('social_account_snapshots').insert(row({ observed_on: '2026-10-28', ...over }) as never)
        expect(error).not.toBeNull()
      }
    })

    it('el creador dueño lee su histórico', async () => {
      const { data, error } = await creator!.client.from('social_account_snapshots').select('observed_on').eq('social_account_id', accountId)
      expect(error).toBeNull()
      expect((data ?? []).length).toBeGreaterThanOrEqual(2)
    })

    it('otro creador y el partner no lo ven', async () => {
      for (const session of [other!, partner!]) {
        const { data } = await session.client.from('social_account_snapshots').select('observed_on').eq('social_account_id', accountId)
        expect(data ?? []).toHaveLength(0)
      }
    })

    it.each([['creador', () => creator!], ['partner', () => partner!], ['ajeno', () => other!]])('el navegador (%s) no puede escribir snapshots', async (_n, who) => {
      const session = who()
      const ins = await session.client.from('social_account_snapshots').insert(row({ observed_on: '2026-10-20', followers_count: 999999 }) as never)
      expect(ins.error).not.toBeNull()
      await session.client.from('social_account_snapshots').update({ followers_count: 999999 } as never).eq('social_account_id', accountId)
      await session.client.from('social_account_snapshots').delete().eq('social_account_id', accountId)
      const { data } = await admin.from('social_account_snapshots').select('followers_count').eq('social_account_id', accountId).eq('observed_on', DAY).single()
      expect((data as { followers_count: number }).followers_count).toBe(101)
    })

    it('borrar la cuenta borra su histórico (en cascada)', async () => {
      await admin.from('social_account_snapshots').insert({ social_account_id: otherAccountId, observed_on: DAY, followers_count: 1 } as never)
      await admin.from('social_accounts').delete().eq('id', otherAccountId)
      const { data } = await admin.from('social_account_snapshots').select('observed_on').eq('social_account_id', otherAccountId)
      expect(data ?? []).toHaveLength(0)
    })
  })

  // ------------------------------------------------------------------------------------------------
  describe('M3 · metrics', () => {
    const metric = (over: Record<string, unknown> = {}) => ({
      post_id: postA, social_account_id: accountId, source: 'youtube', measured_on: DAY, measured_at: new Date().toISOString(),
      views: 10, likes: null, comments: 2, shares: null, saves: null, reach: null, unavailable_metrics: ['likes'], ...over
    })

    it('una métrica que el proveedor no da es null (no 0) y queda anotada', async () => {
      const { error } = await admin.from('metrics').upsert(metric() as never, { onConflict: 'post_id,source,measured_on' })
      expect(error).toBeNull()
      const { data } = await admin.from('metrics').select('views, likes, comments, unavailable_metrics').eq('post_id', postA).single()
      expect(data).toEqual({ views: 10, likes: null, comments: 2, unavailable_metrics: ['likes'] })
    })

    it('repetir el mismo sync el mismo día actualiza la misma fila (idempotente)', async () => {
      await admin.from('metrics').upsert(metric({ views: 15 }) as never, { onConflict: 'post_id,source,measured_on' })
      const { data } = await admin.from('metrics').select('views').eq('post_id', postA)
      expect(data).toEqual([{ views: 15 }])
    })

    it('otro día añade una fila nueva: se conserva el histórico diario', async () => {
      await admin.from('metrics').upsert(metric({ measured_on: '2026-10-31', views: 20 }) as never, { onConflict: 'post_id,source,measured_on' })
      const { data } = await admin.from('metrics').select('views').eq('post_id', postA).order('measured_on')
      expect(data).toEqual([{ views: 15 }, { views: 20 }])
    })

    it('una fila sin los campos nuevos sigue siendo válida (compatibilidad con lo anterior)', async () => {
      const { data, error } = await admin.from('metrics').insert({ post_id: postB } as never).select('views, source, unavailable_metrics').single()
      expect(error).toBeNull()
      expect(data).toEqual({ views: null, source: null, unavailable_metrics: [] })
    })

    it('source solo admite instagram o youtube y no se aceptan cifras negativas en reach', async () => {
      const bad = await admin.from('metrics').insert(metric({ post_id: postB, source: 'inventado', measured_on: '2026-10-01' }) as never)
      const neg = await admin.from('metrics').insert(metric({ post_id: postB, reach: -5, measured_on: '2026-10-02' }) as never)
      expect(bad.error).not.toBeNull()
      expect(neg.error).not.toBeNull()
    })

    it('el creador dueño lee sus métricas; un ajeno no', async () => {
      const mine = await creator!.client.from('metrics').select('views').eq('post_id', postA)
      expect((mine.data ?? []).length).toBe(2)
      const theirs = await other!.client.from('metrics').select('views').eq('post_id', postA)
      expect(theirs.data ?? []).toHaveLength(0)
    })

    it('el partner solo lee las métricas de publicaciones de su colaboración', async () => {
      const notHis = await partner!.client.from('metrics').select('views').eq('post_id', postA)
      expect(notHis.data ?? []).toHaveLength(0)
      if (!postCollab) return
      await admin.from('metrics').upsert(metric({ post_id: postCollab, views: 77 }) as never, { onConflict: 'post_id,source,measured_on' })
      const his = await partner!.client.from('metrics').select('views').eq('post_id', postCollab)
      expect(his.data).toEqual([{ views: 77 }])
    })

    it.each([['creador', () => creator!], ['partner', () => partner!], ['ajeno', () => other!]])('el navegador (%s) no puede escribir métricas', async (_n, who) => {
      const session = who()
      const ins = await session.client.from('metrics').insert(metric({ post_id: postB, measured_on: '2026-10-03', views: 999999 }) as never)
      expect(ins.error).not.toBeNull()
      await session.client.from('metrics').update({ views: 999999 } as never).eq('post_id', postA)
      await session.client.from('metrics').delete().eq('post_id', postA)
      const { data } = await admin.from('metrics').select('views').eq('post_id', postA).eq('measured_on', DAY).single()
      expect((data as { views: number }).views).toBe(15)
    })
  })
})

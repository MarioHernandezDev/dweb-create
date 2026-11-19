import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { creatorSession, hasSupabaseEnv, unrelatedCreatorSession } from './supabase-setup'

/**
 * A-R21f: supabase/migrations/20261030120000_posts_collaboration_check.sql
 *
 * `posts_insert_self` / `posts_update_self` solo exigían `creator_id = yo`;
 * nada comprobaba en servidor que `collaboration_id` fuese una colaboración
 * DEL PROPIO creador (solo lo limitaba la interfaz).
 *
 * ANTES de aplicar la migración deben FALLAR los tests de "rechazo"
 * (demuestran el hueco); DESPUÉS deben pasar todos. Escribe filas con el
 * título `[TEST r21f]` (service_role para limpiar) y solo corre con
 * RUN_SOCIAL_ACCOUNTS_RLS=1.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY
const TITLE = '[TEST r21f] '

describe.skipIf(!enabled)('posts.collaboration_id: solo colaboraciones propias (RLS, Supabase real)', () => {
  let admin: SupabaseClient
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let other: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let creatorId: string
  let ownCollab: string | null = null
  let foreignCollab: string | null = null
  let ownPostId: string
  let ready = false

  const base = (over: Record<string, unknown> = {}) => ({
    creator_id: creatorId, title: TITLE + 'x', content_type: 'reel', platform: 'instagram', status: 'idea',
    due_date: new Date(Date.now() + 86_400_000).toISOString(), ...over
  })

  async function cleanup() {
    if (admin) await admin.from('posts').delete().like('title', `${TITLE}%`)
  }

  beforeAll(async () => {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    creator = await creatorSession()
    other = await unrelatedCreatorSession()
    if (!creator || !other) return
    const { data: c } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    creatorId = (c as { id: string }).id
    const { data: mine } = await admin.from('collaborations').select('id').eq('creator_id', creatorId).limit(1).maybeSingle()
    // Cualquier colaboración de OTRO creador (no hace falta que sea la del demo "ajeno").
    const { data: theirs } = await admin.from('collaborations').select('id').neq('creator_id', creatorId).limit(1).maybeSingle()
    ownCollab = (mine as { id: string } | null)?.id ?? null
    foreignCollab = (theirs as { id: string } | null)?.id ?? null
    const { data: post, error } = await admin.from('posts').insert(base({ title: TITLE + 'propia' }) as never).select('id').single()
    if (error) throw error
    ownPostId = (post as { id: string }).id
    ready = true
  })

  afterAll(cleanup)

  it('precondiciones: sesiones y datos de prueba (una colaboración propia y otra ajena)', () => {
    expect(creator).not.toBeNull()
    expect(other).not.toBeNull()
    expect(ready).toBe(true)
    expect(ownCollab).not.toBeNull()
    expect(foreignCollab).not.toBeNull()
  })

  it('sin colaboración (contenido propio) se puede crear y actualizar', async () => {
    const ins = await creator!.client.from('posts').insert(base({ title: TITLE + 'sin colab' }) as never).select('id').single()
    expect(ins.error).toBeNull()
    const upd = await creator!.client.from('posts').update({ collaboration_id: null } as never).eq('id', ownPostId).select('id')
    expect(upd.error).toBeNull()
  })

  it('RECHAZO: no se puede crear una publicación ligada a una colaboración de otro creador', async () => {
    const ins = await creator!.client.from('posts').insert(base({ title: TITLE + 'ajena', collaboration_id: foreignCollab }) as never).select('id')
    expect(ins.error).not.toBeNull()
  })

  it('RECHAZO: no se puede actualizar una publicación propia para ligarla a una colaboración ajena', async () => {
    const upd = await creator!.client.from('posts').update({ collaboration_id: foreignCollab } as never).eq('id', ownPostId).select('id')
    const { data } = await admin.from('posts').select('collaboration_id').eq('id', ownPostId).single()
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true)
    expect((data as { collaboration_id: string | null }).collaboration_id).not.toBe(foreignCollab)
  })

  it('una colaboración propia sigue pudiendo enlazarse', async () => {
    const ins = await creator!.client.from('posts').insert(base({ title: TITLE + 'colab propia', collaboration_id: ownCollab }) as never).select('id').single()
    expect(ins.error).toBeNull()
    const upd = await creator!.client.from('posts').update({ collaboration_id: ownCollab } as never).eq('id', ownPostId).select('id')
    expect(upd.error).toBeNull()
    expect((upd.data ?? []).length).toBe(1)
  })

  it('un creador ajeno no puede tocar publicaciones que no son suyas', async () => {
    const upd = await other!.client.from('posts').update({ title: TITLE + 'hackeada' } as never).eq('id', ownPostId).select('id')
    expect((upd.data ?? []).length).toBe(0)
  })
})

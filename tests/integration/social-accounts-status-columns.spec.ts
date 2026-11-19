import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { creatorSession, hasSupabaseEnv, partnerSession, unrelatedCreatorSession } from './supabase-setup'

/**
 * M1 (A-R2) — columnas de estado de `social_accounts`
 * (supabase/migrations/20261028130000_social_accounts_status_columns.sql).
 *
 * Escribe en el Supabase compartido (filas de prueba con service_role), así
 * que solo corre con RUN_SOCIAL_ACCOUNTS_RLS=1 y coordinando con la otra rama.
 * Las filas de prueba llevan el handle `a-r2-m1-test` (linkedin y x) y se
 * borran al terminar; si el creador demo ya tuviera filas de esas
 * plataformas, aborta sin tocar nada.
 *
 * ANTES de aplicar la migración deben fallar los tests de columnas nuevas
 * (las columnas no existen); DESPUÉS deben pasar todos.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY
const HANDLE = 'a-r2-m1-test'

describe.skipIf(!enabled)('social_accounts: columnas de estado (M1, Supabase real)', () => {
  let admin: SupabaseClient
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let other: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let creatorId: string
  let otherCreatorId: string
  let withTokenId: string
  let withoutTokenId: string
  let ready = false

  async function cleanup() {
    if (!admin) return
    await admin.from('social_accounts').delete().eq('handle', HANDLE)
  }

  beforeAll(async () => {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    creator = await creatorSession()
    partner = await partnerSession()
    other = await unrelatedCreatorSession()
    if (!creator || !partner || !other) return

    const { data: c1 } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    const { data: c2 } = await admin.from('creators').select('id').eq('profile_id', other.userId).single()
    creatorId = (c1 as { id: string }).id
    otherCreatorId = (c2 as { id: string }).id

    const { data: existing } = await admin.from('social_accounts').select('id').in('creator_id', [creatorId, otherCreatorId]).in('platform', ['linkedin', 'x'])
    if ((existing ?? []).length > 0) {
      console.error('[social-accounts-status] ya hay filas de linkedin/x en los creadores de prueba: se aborta sin tocar nada.')
      return
    }

    const { data: a, error: e1 } = await admin
      .from('social_accounts')
      .insert({ creator_id: creatorId, platform: 'linkedin', handle: HANDLE, followers_count: 1, access_token_encrypted: 'a-r2-m1-fake-token' } as never)
      .select('id')
      .single()
    const { data: b, error: e2 } = await admin
      .from('social_accounts')
      .insert({ creator_id: creatorId, platform: 'x', handle: HANDLE, followers_count: 1 } as never)
      .select('id')
      .single()
    if (e1 || e2) {
      console.error('[social-accounts-status] no se pudieron crear las filas de prueba:', e1?.message ?? e2?.message)
      await cleanup()
      return
    }
    withTokenId = (a as { id: string }).id
    withoutTokenId = (b as { id: string }).id
    ready = true
  })

  afterAll(cleanup)

  it('precondiciones: cuentas autenticadas y filas de prueba creadas', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
    expect(other).not.toBeNull()
    expect(ready).toBe(true)
  })

  describe('valores por defecto y columna generada (service_role)', () => {
    it('una fila nueva nace connected y sin errores ni sincronizaciones', async () => {
      const { data, error } = await admin
        .from('social_accounts')
        .select('status, last_error_code, last_error_at, last_synced_at, last_sync_attempt_at, sync_lock_until, external_account_id')
        .eq('id', withTokenId)
        .single()
      expect(error).toBeNull()
      expect(data).toEqual({
        status: 'connected', last_error_code: null, last_error_at: null, last_synced_at: null,
        last_sync_attempt_at: null, sync_lock_until: null, external_account_id: null
      })
    })

    it('is_verified es true con token y false sin token', async () => {
      const { data } = await admin.from('social_accounts').select('id, is_verified').in('id', [withTokenId, withoutTokenId])
      const byId = Object.fromEntries((data as { id: string; is_verified: boolean }[]).map((r) => [r.id, r.is_verified]))
      expect(byId[withTokenId]).toBe(true)
      expect(byId[withoutTokenId]).toBe(false)
    })

    it('is_verified no se puede escribir', async () => {
      const { error } = await admin.from('social_accounts').update({ is_verified: false } as never).eq('id', withTokenId)
      expect(error).not.toBeNull()
    })

    it('status rechaza valores fuera de la lista', async () => {
      const { error } = await admin.from('social_accounts').update({ status: 'inventado' } as never).eq('id', withTokenId)
      expect(error).not.toBeNull()
    })

    it.each(['connected', 'expired', 'revoked', 'missing_permissions'])('status acepta %s', async (status) => {
      const { error } = await admin.from('social_accounts').update({ status } as never).eq('id', withTokenId)
      expect(error).toBeNull()
    })
  })

  describe('unicidad de la cuenta del proveedor', () => {
    it('la misma cuenta (plataforma + id externo) no puede estar en dos creadores', async () => {
      const { data: second, error: e0 } = await admin
        .from('social_accounts')
        .insert({ creator_id: otherCreatorId, platform: 'linkedin', handle: HANDLE, followers_count: 1 } as never)
        .select('id')
        .single()
      expect(e0).toBeNull()
      const first = await admin.from('social_accounts').update({ external_account_id: 'ext-a-r2-m1' } as never).eq('id', withTokenId)
      expect(first.error).toBeNull()
      const clash = await admin.from('social_accounts').update({ external_account_id: 'ext-a-r2-m1' } as never).eq('id', (second as { id: string }).id)
      expect(clash.error).not.toBeNull()
    })

    it('varias filas sin id externo conviven (el índice es parcial)', async () => {
      const { data } = await admin.from('social_accounts').select('id').eq('handle', HANDLE).is('external_account_id', null)
      expect((data ?? []).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('lo que el navegador puede y no puede leer', () => {
    it.each(['status', 'last_synced_at', 'last_error_code', 'is_verified'])('el dueño SÍ puede leer %s', async (column) => {
      const { error } = await creator!.client.from('social_accounts').select(column).eq('id', withTokenId)
      expect(error).toBeNull()
    })

    it.each(['last_error_at', 'last_sync_attempt_at', 'sync_lock_until', 'external_account_id'])('el dueño NO puede leer %s', async (column) => {
      const { error } = await creator!.client.from('social_accounts').select(column).eq('id', withTokenId)
      expect(error).not.toBeNull()
    })

    it('los tokens siguen sin poder leerse (A-R11)', async () => {
      const { error } = await creator!.client.from('social_accounts').select('access_token_encrypted').eq('id', withTokenId)
      expect(error).not.toBeNull()
    })

    it('otro creador y el partner no ven la fila ni su estado', async () => {
      for (const session of [other!, partner!]) {
        const { data } = await session.client.from('social_accounts').select('status, is_verified').eq('id', withTokenId)
        expect(data ?? []).toHaveLength(0)
      }
    })
  })

  describe('el navegador no puede escribir el estado', () => {
    it('no puede cambiar status', async () => {
      await admin.from('social_accounts').update({ status: 'connected' } as never).eq('id', withTokenId)
      await creator!.client.from('social_accounts').update({ status: 'revoked' } as never).eq('id', withTokenId)
      const { data } = await admin.from('social_accounts').select('status').eq('id', withTokenId).single()
      expect((data as { status: string }).status).toBe('connected')
    })

    it('no puede cambiar last_synced_at', async () => {
      await creator!.client.from('social_accounts').update({ last_synced_at: new Date().toISOString() } as never).eq('id', withTokenId)
      const { data } = await admin.from('social_accounts').select('last_synced_at').eq('id', withTokenId).single()
      expect((data as { last_synced_at: string | null }).last_synced_at).toBeNull()
    })
  })
})

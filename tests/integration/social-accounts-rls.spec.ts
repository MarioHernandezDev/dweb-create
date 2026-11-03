import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, creatorSession, hasSupabaseEnv, partnerSession, unrelatedCreatorSession } from './supabase-setup'

/**
 * A-R11 — seguridad de `social_accounts` (ver
 * docs/PROPUESTA_A-R11_SEGURIDAD_SOCIAL_ACCOUNTS.md).
 *
 * Los tests describen el comportamiento DESEADO tras aplicar la migración
 * propuesta. Ejecutados ANTES de aplicarla, los de "lectura de tokens",
 * "alta falsa" y "actualizar seguidores" deben FALLAR: esa es la evidencia
 * reproducible del hueco actual. Tras aplicarla deben pasar todos.
 *
 * ESCRIBEN EN EL SUPABASE COMPARTIDO (filas de prueba con service_role) y el
 * límite de autenticación es compartido con la otra rama. Por eso NO se
 * ejecutan con `npm run test:integration` a secas: hace falta activar
 * explícitamente RUN_SOCIAL_ACCOUNTS_RLS=1 y coordinar la ventana con Mario.
 *
 * Seguridad de los datos: solo se crean/modifican/borran filas propias de
 * este test (marcadas con el handle `a-r11-test`, plataformas linkedin y x,
 * que no tienen ninguna fila real). Nunca se toca una fila existente.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY

const TEST_HANDLE = 'a-r11-test'
const FAKE_TOKEN = 'a-r11-fake-token-not-a-secret'

describe.skipIf(!enabled)('social_accounts: RLS y permisos por columna (Supabase real)', () => {
  let admin: SupabaseClient
  let creator: Awaited<ReturnType<typeof creatorSession>>
  let partner: Awaited<ReturnType<typeof partnerSession>>
  let other: Awaited<ReturnType<typeof unrelatedCreatorSession>>
  let creatorId: string
  let verifiedRowId: string
  let unverifiedRowId: string
  let ready = false

  async function cleanup() {
    if (!admin || !creatorId) return
    // Solo filas marcadas como de este test, nunca las reales del creador demo.
    await admin.from('social_accounts').delete().eq('creator_id', creatorId).eq('handle', TEST_HANDLE)
  }

  beforeAll(async () => {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    creator = await creatorSession()
    partner = await partnerSession()
    other = await unrelatedCreatorSession()
    if (!creator || !partner || !other) return

    const { data: creatorRow } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    creatorId = (creatorRow as { id: string }).id

    // Si ya hubiera filas reales en las plataformas de prueba, no se arriesga nada.
    const { data: existing } = await admin.from('social_accounts').select('id').eq('creator_id', creatorId).in('platform', ['linkedin', 'x'])
    if ((existing ?? []).length > 0) {
      console.error('[social-accounts-rls] el creador demo ya tiene filas de linkedin/x: se aborta para no tocar datos reales.')
      return
    }

    const { data: verified, error: e1 } = await admin
      .from('social_accounts')
      .insert({ creator_id: creatorId, platform: 'linkedin', handle: TEST_HANDLE, followers_count: 1, access_token_encrypted: FAKE_TOKEN } as never)
      .select('id')
      .single()
    const { data: unverified, error: e2 } = await admin
      .from('social_accounts')
      .insert({ creator_id: creatorId, platform: 'x', handle: TEST_HANDLE, followers_count: 1 } as never)
      .select('id')
      .single()
    if (e1 || e2) {
      console.error('[social-accounts-rls] no se pudieron crear las filas de prueba:', e1?.message ?? e2?.message)
      await cleanup()
      return
    }
    verifiedRowId = (verified as { id: string }).id
    unverifiedRowId = (unverified as { id: string }).id
    ready = true
  })

  afterAll(cleanup)

  it('precondiciones: cuentas autenticadas y filas de prueba creadas', () => {
    expect(creator).not.toBeNull()
    expect(partner).not.toBeNull()
    expect(other).not.toBeNull()
    expect(ready).toBe(true)
  })

  describe('el dueño solo lee columnas no sensibles', () => {
    it('puede leer id, plataforma, handle y seguidores de su fila', async () => {
      const { data, error } = await creator!.client.from('social_accounts').select('id, platform, handle, followers_count').eq('id', verifiedRowId)
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it.each(['access_token_encrypted', 'refresh_token_encrypted', 'token_expires_at'])('NO puede leer %s', async (column) => {
      const { error } = await creator!.client.from('social_accounts').select(column).eq('id', verifiedRowId)
      expect(error).not.toBeNull()
    })

    it('select * falla (no devuelve las columnas sensibles)', async () => {
      const { data, error } = await creator!.client.from('social_accounts').select('*').eq('id', verifiedRowId)
      expect(error !== null || (data ?? []).every((row) => !('access_token_encrypted' in (row as object)))).toBe(true)
    })
  })

  describe('el navegador no puede falsificar cuentas ni seguidores', () => {
    it('NO puede insertar una cuenta con un token falso', async () => {
      const { error } = await creator!.client
        .from('social_accounts')
        .insert({ creator_id: creatorId, platform: 'facebook', handle: TEST_HANDLE, followers_count: 999999, access_token_encrypted: 'forjado' } as never)
      expect(error).not.toBeNull()
      // Si el insert hubiera funcionado, que no quede basura (la limpieza final borra por handle).
    })

    it('NO puede cambiar followers_count de su fila', async () => {
      await creator!.client.from('social_accounts').update({ followers_count: 999999 } as never).eq('id', verifiedRowId)
      const { data } = await admin.from('social_accounts').select('followers_count').eq('id', verifiedRowId).single()
      expect((data as { followers_count: number }).followers_count).toBe(1)
    })

    it('NO puede cambiar el token de su fila', async () => {
      await creator!.client.from('social_accounts').update({ access_token_encrypted: 'otro' } as never).eq('id', unverifiedRowId)
      const { data } = await admin.from('social_accounts').select('access_token_encrypted').eq('id', unverifiedRowId).single()
      expect((data as { access_token_encrypted: string | null }).access_token_encrypted).toBeNull()
    })
  })

  describe('aislamiento entre usuarios', () => {
    it('otro creador no ve la fila', async () => {
      const { data } = await other!.client.from('social_accounts').select('id').eq('id', verifiedRowId)
      expect(data ?? []).toHaveLength(0)
    })

    it('el partner no ve la fila', async () => {
      const { data } = await partner!.client.from('social_accounts').select('id').eq('id', verifiedRowId)
      expect(data ?? []).toHaveLength(0)
    })

    it('un anónimo no ve la fila', async () => {
      const { data } = await anonClient()!.from('social_accounts').select('id').eq('id', verifiedRowId)
      expect(data ?? []).toHaveLength(0)
    })
  })

  describe('RPC pública de redes verificadas (control: ya funciona hoy)', () => {
    it('devuelve la fila con token y no la que no tiene', async () => {
      const { data, error } = await partner!.client.rpc('get_public_social_accounts', { p_creator_id: creatorId } as never)
      expect(error).toBeNull()
      const platforms = ((data ?? []) as { platform: string }[]).map((r) => r.platform)
      expect(platforms).toContain('linkedin')
      expect(platforms).not.toContain('x')
    })

    it('no expone columnas de token', async () => {
      const { data } = await partner!.client.rpc('get_public_social_accounts', { p_creator_id: creatorId } as never)
      for (const row of (data ?? []) as object[]) {
        expect(Object.keys(row).sort()).toEqual(['followers_count', 'handle', 'platform'])
      }
    })
  })

  // H0-08 (supabase/migrations/20261103130000_social_accounts_server_only_delete.sql):
  // desde A-R3 la desconexión la hace el servidor (revoca en Google y luego borra).
  // ANTES de aplicar la migración el primer test FALLA (el navegador aún puede borrar).
  describe('borrado solo desde el servidor (A-R3, H0-08)', () => {
    it('el dueño NO puede borrar su fila con una petición directa', async () => {
      await creator!.client.from('social_accounts').delete().eq('id', unverifiedRowId)
      const { data } = await admin.from('social_accounts').select('id').eq('id', unverifiedRowId)
      expect(data ?? []).toHaveLength(1)
    })

    it('otro creador no puede borrar la fila ajena', async () => {
      await other!.client.from('social_accounts').delete().eq('id', verifiedRowId)
      const { data } = await admin.from('social_accounts').select('id').eq('id', verifiedRowId)
      expect(data ?? []).toHaveLength(1)
    })
  })
})

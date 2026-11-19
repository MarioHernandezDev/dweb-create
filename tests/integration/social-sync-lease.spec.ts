import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { acquireLease, releaseLease } from '../../server/utils/sync-lease'
import { hasSupabaseEnv, creatorSession } from './supabase-setup'

/**
 * A-R5 — el cerrojo por cuenta (`social_accounts.sync_lock_until`) es lo que
 * impide que dos ejecuciones de la sincronización procesen la MISMA cuenta a
 * la vez. Es una sola sentencia atómica en la base de datos; aquí se prueba
 * contra el Supabase real, no contra un simulacro.
 *
 * Escribe en el Supabase compartido (una fila de prueba con service_role,
 * handle `a-r5-lease-test`, plataforma linkedin donde el creador demo no tiene
 * ninguna) y se borra al terminar. Solo corre con RUN_SOCIAL_ACCOUNTS_RLS=1.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY
const HANDLE = 'a-r5-lease-test'

describe.skipIf(!enabled)('sync-lease: cerrojo por cuenta (Supabase real)', () => {
  let admin: SupabaseClient
  let accountId: string
  let ready = false

  beforeAll(async () => {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const creator = await creatorSession()
    if (!creator) return
    const { data: row } = await admin.from('creators').select('id').eq('profile_id', creator.userId).single()
    const creatorId = (row as { id: string }).id

    const { data: existing } = await admin.from('social_accounts').select('id').eq('creator_id', creatorId).eq('platform', 'linkedin')
    if ((existing ?? []).length > 0) {
      console.error('[sync-lease] el creador demo ya tiene una fila de linkedin: se aborta sin tocar nada.')
      return
    }
    const { data, error } = await admin
      .from('social_accounts')
      .insert({ creator_id: creatorId, platform: 'linkedin', handle: HANDLE, followers_count: 1 } as never)
      .select('id')
      .single()
    if (error) {
      console.error('[sync-lease] no se pudo crear la fila de prueba:', error.message)
      return
    }
    accountId = (data as { id: string }).id
    ready = true
  })

  afterAll(async () => {
    if (admin) await admin.from('social_accounts').delete().eq('handle', HANDLE)
  })

  it('precondición: fila de prueba creada', () => {
    expect(ready).toBe(true)
  })

  it('la primera ejecución consigue el cerrojo y la segunda NO', async () => {
    expect(await acquireLease(admin, accountId)).toBe(true)
    expect(await acquireLease(admin, accountId)).toBe(false)
  })

  it('con varias ejecuciones a la vez solo UNA gana el cerrojo', async () => {
    await releaseLease(admin, accountId)
    const attempts = await Promise.all(Array.from({ length: 8 }, () => acquireLease(admin, accountId)))
    expect(attempts.filter(Boolean)).toHaveLength(1)
  })

  it('al liberar el cerrojo se puede volver a tomar', async () => {
    await releaseLease(admin, accountId)
    expect(await acquireLease(admin, accountId)).toBe(true)
  })

  it('un cerrojo caducado (proceso muerto) se puede tomar de nuevo', async () => {
    await releaseLease(admin, accountId)
    const past = new Date(Date.now() - 10 * 60_000)
    expect(await acquireLease(admin, accountId, past, 60_000)).toBe(true) // caducó hace ~9 min
    expect(await acquireLease(admin, accountId)).toBe(true)
  })

  it('tomar el cerrojo anota el intento y no toca el estado de la cuenta', async () => {
    await releaseLease(admin, accountId)
    await acquireLease(admin, accountId)
    const { data } = await admin.from('social_accounts').select('status, last_sync_attempt_at, followers_count').eq('id', accountId).single()
    const row = data as { status: string; last_sync_attempt_at: string | null; followers_count: number }
    expect(row.status).toBe('connected')
    expect(row.last_sync_attempt_at).not.toBeNull()
    expect(row.followers_count).toBe(1)
  })
})

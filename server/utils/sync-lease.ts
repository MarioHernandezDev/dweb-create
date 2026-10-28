import type { SupabaseClient } from '@supabase/supabase-js'
import { SYNC_LEASE_MS } from './sync-batch'

/**
 * Cerrojo por cuenta contra ejecuciones simultáneas (A-R5). Es una única
 * sentencia atómica en la base de datos: solo una ejecución puede pasar de
 * "sin cerrojo (o caducado)" a "cerrojo hasta T", aunque haya varias
 * instancias del servidor. Si el proceso muere, el cerrojo caduca solo.
 * Usa `social_accounts.sync_lock_until` (migración M1).
 */
export async function acquireLease(client: SupabaseClient, accountId: string, now: Date = new Date(), leaseMs: number = SYNC_LEASE_MS): Promise<boolean> {
  const { data, error } = await client
    .from('social_accounts')
    .update({ sync_lock_until: new Date(now.getTime() + leaseMs).toISOString(), last_sync_attempt_at: now.toISOString() } as never)
    .eq('id', accountId)
    .or(`sync_lock_until.is.null,sync_lock_until.lt.${now.toISOString()}`)
    .select('id')
  if (error) throw error
  return (data?.length ?? 0) > 0
}

/** Libera el cerrojo. Nunca lanza: si falla, caduca solo. */
export async function releaseLease(client: SupabaseClient, accountId: string): Promise<void> {
  try {
    await client.from('social_accounts').update({ sync_lock_until: null } as never).eq('id', accountId)
  } catch (err) {
    console.error('[sync-lease] no se pudo liberar el cerrojo (caducará solo):', err instanceof Error ? err.message : 'error')
  }
}

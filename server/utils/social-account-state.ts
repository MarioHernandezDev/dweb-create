import type { SupabaseClient } from '@supabase/supabase-js'
import { describeErrorForLog, type SocialErrorInfo } from './social-errors'

/**
 * Qué se guarda en `social_accounts` tras cada intento de sincronización
 * (columnas de la migración M1, A-R2). La lógica de decisión es pura y se
 * prueba con tests unitarios; las funciones que escriben son una capa fina
 * por encima y NUNCA lanzan: si no se puede guardar el estado, el error
 * original de la sincronización es el que debe llegar al usuario.
 *
 * Reglas:
 *  - Éxito: la cuenta vuelve a `connected` y se limpian los errores.
 *  - Fallo que exige reconectar (caducado, revocado, faltan permisos): se
 *    cambia `status`.
 *  - Fallo temporal (red, cuota) o desconocido: solo se anota el código y la
 *    hora; NO se toca `status`, para no enseñar "Reconectar" por un corte.
 */

const RECONNECT_STATUSES = ['expired', 'revoked', 'missing_permissions'] as const

export function successPatch(now: Date = new Date()) {
  const iso = now.toISOString()
  return { status: 'connected', last_error_code: null, last_error_at: null, last_synced_at: iso, last_sync_attempt_at: iso }
}

export function failurePatch(info: SocialErrorInfo, now: Date = new Date()) {
  const iso = now.toISOString()
  const patch: Record<string, unknown> = { last_sync_attempt_at: iso, last_error_at: iso, last_error_code: info.code }
  if ((RECONNECT_STATUSES as readonly string[]).includes(info.kind)) patch.status = info.kind
  return patch
}

async function applyPatch(client: SupabaseClient, accountId: string, patch: Record<string, unknown>, label: string) {
  try {
    const { error } = await client.from('social_accounts').update(patch as never).eq('id', accountId)
    if (error) console.error(`[social-account-state] no se pudo guardar el estado (${label}):`, error.message)
  } catch (err) {
    console.error(`[social-account-state] no se pudo guardar el estado (${label}):`, describeErrorForLog(err))
  }
}

export function recordSyncFailure(client: SupabaseClient, accountId: string, info: SocialErrorInfo) {
  return applyPatch(client, accountId, failurePatch(info), 'fallo')
}

export function recordSyncSuccess(client: SupabaseClient, accountId: string, extra: Record<string, unknown> = {}) {
  return applyPatch(client, accountId, { ...extra, ...successPatch() }, 'éxito')
}

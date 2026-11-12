import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Lógica pura de la sincronización programada (A-R5), sin Nitro ni Supabase
 * para poder probarla con tests unitarios. El endpoint
 * `server/api/social/sync-all.post.ts` la usa y es independiente de qué
 * scheduler lo llame (decisión Q3 pendiente: todavía no hay ninguno).
 */

/** Cuentas que se procesan como máximo en una llamada. */
export const SYNC_BATCH_SIZE = 25
/** Una cuenta no se vuelve a sincronizar antes de este tiempo tras la última sincronización correcta. */
export const SYNC_MIN_INTERVAL_MS = 60 * 60_000
/** Tras un intento (correcto o no) no se reintenta la cuenta antes de este tiempo. */
export const SYNC_RETRY_SPACING_MS = 15 * 60_000
/** Duración del cerrojo por cuenta: si el proceso muere, caduca solo. */
export const SYNC_LEASE_MS = 5 * 60_000
/** Cuentas sincronizadas a la vez. */
export const SYNC_CONCURRENCY = 3

/** Un token de Instagram de larga duración vale 60 días (documentación de Meta). */
const INSTAGRAM_TOKEN_LIFETIME_MS = 60 * 86_400_000
/** Se renueva cuando le quedan 14 días o menos. */
const INSTAGRAM_REFRESH_WINDOW_MS = 14 * 86_400_000
/** Meta solo deja renovar tokens con más de 24 h de vida. */
const INSTAGRAM_MIN_AGE_MS = 24 * 3_600_000

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/** Extrae el token de una cabecera `Authorization: Bearer <token>`. */
export function bearerToken(authorizationHeader: string | undefined): string | null {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

/**
 * Comprueba el secreto compartido en tiempo constante. FALLA CERRADO: si no
 * hay secreto configurado (o está vacío) nunca autoriza. Se comparan los
 * hashes para no revelar la longitud del secreto.
 */
export function verifyCronSecret(authorizationHeader: string | undefined, secret: string | undefined): boolean {
  if (!secret) return false
  const provided = bearerToken(authorizationHeader)
  if (!provided) return false
  return timingSafeEqual(sha256(provided), sha256(secret))
}

export interface SyncCutoffs {
  /** Solo cuentas cuya última sincronización correcta es anterior a esto (o nunca). */
  syncedBefore: string
  /** Solo cuentas cuyo último intento es anterior a esto (o nunca). */
  attemptedBefore: string
  now: string
}

export function syncCutoffs(now: Date): SyncCutoffs {
  return {
    syncedBefore: new Date(now.getTime() - SYNC_MIN_INTERVAL_MS).toISOString(),
    attemptedBefore: new Date(now.getTime() - SYNC_RETRY_SPACING_MS).toISOString(),
    now: now.toISOString()
  }
}

export type InstagramRefreshDecision = 'refresh' | 'wait' | 'expired' | 'unknown'

/**
 * ¿Hay que renovar el token de Instagram? Meta: se renueva si tiene más de
 * 24 h y no ha caducado; cada renovación da otros 60 días. Sin fecha de
 * caducidad guardada no se puede decidir (`unknown`).
 */
export function instagramRefreshDecision(tokenExpiresAt: string | null, now: Date): InstagramRefreshDecision {
  if (!tokenExpiresAt) return 'unknown'
  const expires = new Date(tokenExpiresAt).getTime()
  if (!Number.isFinite(expires)) return 'unknown'
  const remaining = expires - now.getTime()
  if (remaining <= 0) return 'expired'
  const age = INSTAGRAM_TOKEN_LIFETIME_MS - remaining
  if (remaining <= INSTAGRAM_REFRESH_WINDOW_MS && age >= INSTAGRAM_MIN_AGE_MS) return 'refresh'
  return 'wait'
}

export interface SyncAccountResult {
  platform: string
  outcome: 'ok' | 'failed' | 'skipped_locked'
  /** Código corto (p. ej. `ok`, `meta_190`, `network`): nunca mensajes del proveedor. */
  code: string
}

export interface SyncSummary {
  processed: number
  ok: number
  failed: number
  skipped: number
  byCode: Record<string, number>
  durationMs: number
}

/** Resumen para la respuesta y el log: solo recuentos, sin ids de cuenta ni datos personales. */
export function summarizeSync(results: SyncAccountResult[], startedAtMs: number, nowMs: number): SyncSummary {
  const byCode: Record<string, number> = {}
  for (const r of results) byCode[r.code] = (byCode[r.code] ?? 0) + 1
  return {
    processed: results.filter((r) => r.outcome !== 'skipped_locked').length,
    ok: results.filter((r) => r.outcome === 'ok').length,
    failed: results.filter((r) => r.outcome === 'failed').length,
    skipped: results.filter((r) => r.outcome === 'skipped_locked').length,
    byCode,
    durationMs: Math.max(0, nowMs - startedAtMs)
  }
}

/** Ejecuta `worker` sobre cada elemento con un máximo de tareas simultáneas, conservando el orden de los resultados. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

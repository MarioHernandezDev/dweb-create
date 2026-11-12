import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Histórico propio de acumulados por cuenta (A-R8a): una fila por cuenta y día
 * (`social_account_snapshots`, M3). Google no conserva los acumulados con
 * histórico (solo da el valor actual), así que se guardan aquí cada vez que la
 * cuenta se lee con éxito.
 *
 * Reglas:
 *  - Un dato que el proveedor no da es `null`, NUNCA 0 (un canal puede ocultar
 *    sus suscriptores; Instagram no da visualizaciones totales).
 *  - Idempotente: la clave es (cuenta, día UTC); repetir el mismo día actualiza
 *    la misma fila.
 *  - Es un efecto secundario: si guardar el snapshot falla, la sincronización
 *    NO falla (se anota en el log y se sigue); el dato de la cuenta ya está bien.
 */

export interface AccountSnapshot {
  followersCount: number | null
  viewsTotal: number | null
  videosCount: number | null
}

/** Día UTC AAAA-MM-DD (la misma clave para todo el mundo, sin depender de la zona horaria del servidor). */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Un recuento válido (entero ≥ 0) o `null`. Cadenas numéricas aceptadas ("1234"); ausente, vacío o negativo -> null. */
export function countOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

interface YoutubeStatistics {
  subscriberCount?: string
  viewCount?: string
  videoCount?: string
  hiddenSubscriberCount?: boolean
}

/** Snapshot a partir de `channels.statistics` de YouTube. Suscriptores ocultos -> `null`. */
export function snapshotFromYoutube(stats: YoutubeStatistics | undefined): AccountSnapshot {
  return {
    followersCount: stats?.hiddenSubscriberCount ? null : countOrNull(stats?.subscriberCount),
    viewsTotal: countOrNull(stats?.viewCount),
    videosCount: countOrNull(stats?.videoCount)
  }
}

/** Instagram solo da seguidores; el resto no existe como acumulado en el flujo actual. */
export function snapshotFromInstagram(followers: number | undefined): AccountSnapshot {
  return { followersCount: countOrNull(followers), viewsTotal: null, videosCount: null }
}

export function hasAnyValue(s: AccountSnapshot): boolean {
  return s.followersCount !== null || s.viewsTotal !== null || s.videosCount !== null
}

/**
 * Guarda (o actualiza) el snapshot del día. Nunca lanza: devuelve si se guardó.
 * Un snapshot sin ningún dato no se escribe (sería una fila vacía sin valor).
 */
export async function recordAccountSnapshot(
  client: SupabaseClient,
  accountId: string,
  snapshot: AccountSnapshot,
  now: Date = new Date()
): Promise<boolean> {
  if (!hasAnyValue(snapshot)) return false
  try {
    const { error } = await client.from('social_account_snapshots').upsert(
      {
        social_account_id: accountId,
        observed_on: utcDay(now),
        followers_count: snapshot.followersCount,
        views_total: snapshot.viewsTotal,
        videos_count: snapshot.videosCount
      } as never,
      { onConflict: 'social_account_id,observed_on' }
    )
    if (error) {
      console.error('[account-snapshot] no se pudo guardar el snapshot (la sincronización continúa):', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[account-snapshot] fallo inesperado al guardar el snapshot (la sincronización continúa):', err instanceof Error ? err.message : 'error')
    return false
  }
}

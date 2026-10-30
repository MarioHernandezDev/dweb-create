import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchInstagramMediaMetrics } from './instagram-media'
import { buildMetricsRow, mapYoutubeMetrics, recordPostMetrics } from './post-metrics'
import { fetchYoutubeVideos } from './youtube'

/**
 * Lectura de las métricas de las publicaciones VINCULADAS de una cuenta (A-R8b)
 * y escritura en `metrics`. La usan la sincronización de la cuenta, el botón
 * "Actualizar métricas" de la publicación y, al vincular, la primera lectura.
 *
 * Un contenido vinculado que el proveedor ya no devuelve (borrado o privado) se
 * lista en `missing`: no se inventa ninguna fila para él.
 */
export interface LinkRef {
  postId: string
  externalId: string
}

export interface MetricsRefreshResult {
  saved: number
  /** Publicaciones cuyo contenido el proveedor no devolvió. */
  missing: string[]
}

/** Tope de publicaciones por lectura en Instagram (4 llamadas por publicación). */
export const INSTAGRAM_MAX_LINKS_PER_REFRESH = 25
const YOUTUBE_BATCH = 50

export async function loadAccountLinks(client: SupabaseClient, accountId: string): Promise<LinkRef[]> {
  const { data, error } = await client.from('post_external_links').select('post_id, external_id').eq('social_account_id', accountId)
  if (error) {
    console.error('[post-metrics-sync] no se pudieron leer los vínculos de la cuenta:', error.message)
    return []
  }
  return (data as { post_id: string; external_id: string }[]).map((r) => ({ postId: r.post_id, externalId: r.external_id }))
}

export async function refreshYoutubePostMetrics(
  client: SupabaseClient, accountId: string, accessToken: string, links: LinkRef[], now: Date = new Date()
): Promise<MetricsRefreshResult> {
  const rows = []
  const missing: string[] = []
  for (let i = 0; i < links.length; i += YOUTUBE_BATCH) {
    const chunk = links.slice(i, i + YOUTUBE_BATCH)
    const res = await fetchYoutubeVideos(accessToken, chunk.map((l) => l.externalId))
    const byId = new Map((res.items ?? []).map((item) => [item.id, item]))
    for (const l of chunk) {
      const item = byId.get(l.externalId)
      if (!item) {
        missing.push(l.postId)
        continue
      }
      rows.push(buildMetricsRow({ postId: l.postId, accountId, source: 'youtube', values: mapYoutubeMetrics(item.statistics), now }))
    }
  }
  return { saved: await recordPostMetrics(client, rows), missing }
}

export async function refreshInstagramPostMetrics(
  client: SupabaseClient, accountId: string, accessToken: string, links: LinkRef[], now: Date = new Date()
): Promise<MetricsRefreshResult> {
  const rows = []
  for (const l of links.slice(0, INSTAGRAM_MAX_LINKS_PER_REFRESH)) {
    const values = await fetchInstagramMediaMetrics(accessToken, l.externalId)
    rows.push(buildMetricsRow({ postId: l.postId, accountId, source: 'instagram', values, now }))
  }
  return { saved: await recordPostMetrics(client, rows), missing: [] }
}

/**
 * Para la sincronización de la cuenta: efecto secundario que NUNCA hace fallar la
 * sincronización (la cuenta ya se leyó bien); un error se anota y se sigue.
 */
export async function refreshAccountPostMetricsBestEffort(
  client: SupabaseClient, platform: 'youtube' | 'instagram', accountId: string, accessToken: string
): Promise<void> {
  try {
    const links = await loadAccountLinks(client, accountId)
    if (!links.length) return
    if (platform === 'youtube') await refreshYoutubePostMetrics(client, accountId, accessToken, links)
    else await refreshInstagramPostMetrics(client, accountId, accessToken, links)
  } catch (err) {
    console.error('[post-metrics-sync] no se pudieron actualizar las métricas de las publicaciones vinculadas (la sincronización continúa):', err instanceof Error ? err.message : 'error')
  }
}

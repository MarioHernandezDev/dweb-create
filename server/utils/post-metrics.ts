import type { SupabaseClient } from '@supabase/supabase-js'
import { countOrNull, utcDay } from './account-snapshot'

/**
 * Métricas por publicación (A-R8b): mapeo de lo que devuelve cada proveedor a
 * una fila de `metrics` (M3) y escritura idempotente. Lógica pura salvo
 * `recordPostMetrics`.
 *
 * Regla central ("no confundir ausencia con cero"): una métrica que el
 * proveedor no da es `null` Y se anota en `unavailable_metrics`; un 0 real sigue
 * siendo 0. Un `likeCount` que falta (likes ocultos) o unos comentarios
 * desactivados NO son 0.
 */

export const METRIC_KEYS = ['views', 'likes', 'comments', 'shares', 'saves', 'reach'] as const
export type MetricKey = (typeof METRIC_KEYS)[number]
export type PostMetricValues = Record<MetricKey, number | null>

export interface PostMetricsRow extends PostMetricValues {
  post_id: string
  social_account_id: string
  source: 'youtube' | 'instagram'
  measured_on: string
  measured_at: string
  engagement_rate: number | null
  unavailable_metrics: MetricKey[]
}

/** Qué métricas no se pudieron obtener (las que quedaron `null`), en orden estable. */
export function unavailableOf(values: PostMetricValues): MetricKey[] {
  return METRIC_KEYS.filter((k) => values[k] === null)
}

/**
 * Interacción en % = (me gusta + comentarios) ÷ visualizaciones, cálculo de FEEDMA.
 * `null` si falta cualquiera de los tres datos o no hay visualizaciones que dividir.
 * La columna admite hasta 999,999: un valor fuera de rango (datos incoherentes) no se guarda.
 */
export function engagementRateOf(v: Pick<PostMetricValues, 'views' | 'likes' | 'comments'>): number | null {
  if (v.views === null || v.views <= 0 || v.likes === null || v.comments === null) return null
  const rate = ((v.likes + v.comments) / v.views) * 100
  return rate <= 999 ? Math.round(rate * 1000) / 1000 : null
}

interface YoutubeVideoStatistics {
  viewCount?: string
  likeCount?: string
  commentCount?: string
}

/**
 * YouTube (Data API `videos.statistics`): la API OMITE `likeCount` si el canal
 * oculta los me gusta y `commentCount` si desactiva los comentarios. Compartidos,
 * guardados y alcance no existen en esta API: quedan `null` y anotados.
 */
export function mapYoutubeMetrics(stats: YoutubeVideoStatistics | undefined): PostMetricValues {
  return {
    views: countOrNull(stats?.viewCount),
    likes: countOrNull(stats?.likeCount),
    comments: countOrNull(stats?.commentCount),
    shares: null,
    saves: null,
    reach: null
  }
}

export interface InstagramBasicFields {
  like_count?: number
  comments_count?: number
}

/** Una respuesta de `/{media}/insights` de UNA métrica: valor en `values[0].value` o en `total_value.value`. */
export interface InstagramInsightsResponse {
  data?: { name?: string; values?: { value?: unknown }[]; total_value?: { value?: unknown } }[]
}

export function insightValue(res: InstagramInsightsResponse | null | undefined, name: string): number | null {
  const entry = res?.data?.find((d) => d.name === name)
  if (!entry) return null
  return countOrNull(entry.total_value?.value ?? entry.values?.[0]?.value)
}

/**
 * Instagram: me gusta y comentarios de los campos básicos (`like_count` falta si
 * se ocultan) y el resto de insights (cada uno pedido por separado: si uno no
 * existe para ese tipo de publicación, solo ese queda `null`). SIN VERIFICAR con
 * una cuenta real; los nombres siguen la documentación de Meta.
 */
export function mapInstagramMetrics(
  basic: InstagramBasicFields | undefined,
  insights: Partial<Record<'views' | 'reach' | 'saved' | 'shares', number | null>>
): PostMetricValues {
  return {
    views: insights.views ?? null,
    likes: countOrNull(basic?.like_count),
    comments: countOrNull(basic?.comments_count),
    shares: insights.shares ?? null,
    saves: insights.saved ?? null,
    reach: insights.reach ?? null
  }
}

export function buildMetricsRow(input: {
  postId: string
  accountId: string
  source: 'youtube' | 'instagram'
  values: PostMetricValues
  now?: Date
}): PostMetricsRow {
  const now = input.now ?? new Date()
  return {
    post_id: input.postId,
    social_account_id: input.accountId,
    source: input.source,
    measured_on: utcDay(now),
    measured_at: now.toISOString(),
    ...input.values,
    engagement_rate: engagementRateOf(input.values),
    unavailable_metrics: unavailableOf(input.values)
  }
}

/**
 * Guarda las filas (upsert por publicación, origen y día UTC: repetir el mismo
 * día actualiza la misma fila). Nunca lanza: devuelve cuántas se guardaron.
 */
export async function recordPostMetrics(client: SupabaseClient, rows: PostMetricsRow[]): Promise<number> {
  if (!rows.length) return 0
  try {
    const { error } = await client.from('metrics').upsert(rows as never, { onConflict: 'post_id,source,measured_on' })
    if (error) {
      console.error('[post-metrics] no se pudieron guardar las métricas (la operación continúa):', error.message)
      return 0
    }
    return rows.length
  } catch (err) {
    console.error('[post-metrics] fallo inesperado al guardar métricas (la operación continúa):', err instanceof Error ? err.message : 'error')
    return 0
  }
}

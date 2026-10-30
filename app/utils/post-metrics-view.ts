/**
 * Presentación de las métricas de una publicación vinculada (A-R8b). Pura y sin
 * Vue. Reglas:
 *  - Una métrica ausente (`null`) NUNCA es 0: se muestra "—" con su motivo.
 *  - Solo se enseñan las métricas que existen en esa plataforma (YouTube no da
 *    compartidos, guardados ni alcance de un vídeo: no se llenan de "—").
 *  - La variación es un cálculo de FEEDMA entre las dos últimas mediciones de
 *    días distintos; sin dos mediciones o con un dato ausente, no hay variación.
 */
import { formatCompactNumber } from './mock-data'

export type MetricKey = 'views' | 'likes' | 'comments' | 'shares' | 'saves' | 'reach'

export interface MetricRow {
  measured_on: string | null
  source: string | null
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  reach: number | null
  engagement_rate: number | null
}

export const METRIC_DEFS: { key: MetricKey; label: string; icon: string }[] = [
  { key: 'views', label: 'Visualizaciones', icon: 'ph:eye' },
  { key: 'likes', label: 'Me gusta', icon: 'ph:thumbs-up' },
  { key: 'comments', label: 'Comentarios', icon: 'ph:chat-circle-text' },
  { key: 'shares', label: 'Compartidos', icon: 'ph:share-network' },
  { key: 'saves', label: 'Guardados', icon: 'ph:bookmark-simple' },
  { key: 'reach', label: 'Alcance', icon: 'ph:broadcast' }
]

const APPLICABLE: Record<string, MetricKey[]> = {
  youtube: ['views', 'likes', 'comments'],
  instagram: ['views', 'likes', 'comments', 'shares', 'saves', 'reach']
}

export function applicableMetrics(platform: string): MetricKey[] {
  return APPLICABLE[platform] ?? []
}

/** Por qué una métrica aplicable no tiene valor. */
export function reasonFor(platform: string, key: MetricKey): string {
  if (platform === 'youtube') {
    if (key === 'likes') return 'El canal oculta los me gusta de este vídeo'
    if (key === 'comments') return 'Los comentarios están desactivados en este vídeo'
    return 'YouTube no ha devuelto este dato'
  }
  if (key === 'likes') return 'La cuenta oculta los me gusta de esta publicación'
  if (key === 'comments') return 'Instagram no ha devuelto los comentarios'
  return 'Instagram no da esta métrica para este tipo de publicación o falta el permiso de insights'
}

export interface MetricItem {
  key: MetricKey
  label: string
  icon: string
  value: number | null
  text: string
  reason: string | null
  /** Diferencia con la medición anterior; `null` si no hay dos valores comparables. */
  delta: { abs: number; text: string } | null
}

export interface MetricsSummary {
  measuredOn: string
  previousOn: string | null
  items: MetricItem[]
  engagement: number | null
}

const exact = new Intl.NumberFormat('es-ES', { useGrouping: 'always' })

export function formatDelta(abs: number): string {
  const sign = abs > 0 ? '+' : abs < 0 ? '-' : ''
  return `${sign}${exact.format(Math.abs(abs))}`
}

/** Última medición y su variación frente a la anterior de un día distinto. `null` si no hay ninguna. */
export function metricsSummary(rows: MetricRow[], platform: string): MetricsSummary | null {
  const valid = rows
    .filter((r) => r.source !== null && r.measured_on !== null && /^\d{4}-\d{2}-\d{2}$/.test(r.measured_on))
    .sort((a, b) => b.measured_on!.localeCompare(a.measured_on!))
  const latest = valid[0]
  if (!latest) return null
  const previous = valid.find((r) => r.measured_on! < latest.measured_on!) ?? null

  const items = METRIC_DEFS.filter((d) => applicableMetrics(platform).includes(d.key)).map((d): MetricItem => {
    const value = latest[d.key]
    const before = previous ? previous[d.key] : null
    const abs = value !== null && before !== null ? value - before : null
    return {
      key: d.key, label: d.label, icon: d.icon, value,
      text: value === null ? '—' : formatCompactNumber(value),
      reason: value === null ? reasonFor(platform, d.key) : null,
      delta: abs === null ? null : { abs, text: formatDelta(abs) }
    }
  })
  return { measuredOn: latest.measured_on!, previousOn: previous?.measured_on ?? null, items, engagement: latest.engagement_rate }
}

export const ENGAGEMENT_NOTE = 'Interacción = (me gusta + comentarios) ÷ visualizaciones. Es un cálculo de FEEDMA, no una cifra de la red.'

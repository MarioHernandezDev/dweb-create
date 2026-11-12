/**
 * Informe de rendimiento de una colaboración (A-R15). Pura y sin Vue.
 * Reglas:
 *  - Solo cuenta lo que existe: una entrega sin vínculo o sin medición aparece
 *    como tal, nunca con cifras a 0.
 *  - Los totales suman únicamente las entregas que tienen ese dato (`null` no
 *    suma) y dicen cuántas entregas lo aportan; sin ninguna, el total es `null`.
 *  - La autorización no vive aquí: la lectura la limita la RLS de `posts`,
 *    `post_external_links` y `metrics` (el partner solo ve sus colaboraciones).
 */
import { metricsSummary, type MetricKey, type MetricRow, type MetricsSummary } from './post-metrics-view'

export interface ReportPost {
  id: string
  title: string
  platform: string
  status: string
  dueDate: string
}

export interface ReportLink {
  post_id: string
  external_url: string | null
}

export interface ReportMetricRow extends MetricRow {
  post_id: string
}

export type ReportEntryState = 'unlinked' | 'unmeasured' | 'measured'

export interface ReportEntry {
  post: ReportPost
  state: ReportEntryState
  linkUrl: string | null
  summary: MetricsSummary | null
}

export interface ReportTotal {
  key: MetricKey
  label: string
  /** `null` si ninguna entrega aporta el dato. */
  value: number | null
  /** Entregas que aportan el dato. */
  counted: number
}

export interface CollaborationReport {
  entries: ReportEntry[]
  deliverables: number
  linked: number
  measured: number
  totals: ReportTotal[]
}

const TOTAL_KEYS: { key: MetricKey; label: string }[] = [
  { key: 'views', label: 'Visualizaciones' },
  { key: 'likes', label: 'Me gusta' },
  { key: 'comments', label: 'Comentarios' }
]

/** Solo http(s): un enlace guardado nunca debe poder ser `javascript:`. */
export function safeExternalUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

export function buildCollaborationReport(posts: ReportPost[], links: ReportLink[], metrics: ReportMetricRow[]): CollaborationReport {
  const linkByPost = new Map(links.map((l) => [l.post_id, l]))
  const rowsByPost = new Map<string, ReportMetricRow[]>()
  for (const m of metrics) rowsByPost.set(m.post_id, [...(rowsByPost.get(m.post_id) ?? []), m])

  const entries = posts.map((post): ReportEntry => {
    const link = linkByPost.get(post.id)
    if (!link) return { post, state: 'unlinked', linkUrl: null, summary: null }
    const summary = metricsSummary(rowsByPost.get(post.id) ?? [], post.platform)
    return { post, state: summary ? 'measured' : 'unmeasured', linkUrl: safeExternalUrl(link.external_url), summary }
  })

  const totals = TOTAL_KEYS.map(({ key, label }): ReportTotal => {
    let sum = 0
    let counted = 0
    for (const e of entries) {
      const v = e.summary?.items.find((i) => i.key === key)?.value
      if (v !== null && v !== undefined) { sum += v; counted++ }
    }
    return { key, label, value: counted ? sum : null, counted }
  })

  return {
    entries,
    deliverables: entries.length,
    linked: entries.filter((e) => e.state !== 'unlinked').length,
    measured: entries.filter((e) => e.state === 'measured').length,
    totals
  }
}

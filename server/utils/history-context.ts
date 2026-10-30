/**
 * Contexto real para la predicción de éxito (A-R9): qué rendimiento tuvieron
 * las publicaciones ya vinculadas y medidas del propio creador en la misma
 * plataforma. Es un dato de contexto, NO entra en el score ni lo corrige: con
 * pocas publicaciones medidas cualquier "modelo" sería inventado, así que por
 * debajo de MIN_HISTORY_SAMPLE no se devuelve nada (null) y la pantalla sigue
 * diciendo que el score es heurístico.
 */
export const MIN_HISTORY_SAMPLE = 3

export interface MeasuredViewsRow {
  post_id: string
  views: number | null
  measured_on: string | null
}

export interface HistoryContext {
  sampleSize: number
  medianViews: number
  minViews: number
  maxViews: number
}

/** Última medición de cada publicación con visualizaciones conocidas (null no cuenta; 0 real sí). */
function latestViewsPerPost(rows: MeasuredViewsRow[]): number[] {
  const latest = new Map<string, { on: string; views: number }>()
  for (const r of rows) {
    if (r.views === null || !Number.isFinite(r.views) || r.views < 0 || !r.measured_on) continue
    const prev = latest.get(r.post_id)
    if (!prev || r.measured_on > prev.on) latest.set(r.post_id, { on: r.measured_on, views: r.views })
  }
  return [...latest.values()].map((v) => v.views)
}

export function buildHistoryContext(rows: MeasuredViewsRow[]): HistoryContext | null {
  const views = latestViewsPerPost(rows).sort((a, b) => a - b)
  if (views.length < MIN_HISTORY_SAMPLE) return null
  const mid = Math.floor(views.length / 2)
  const median = views.length % 2 ? views[mid]! : Math.round((views[mid - 1]! + views[mid]!) / 2)
  return { sampleSize: views.length, medianViews: median, minViews: views[0]!, maxViews: views[views.length - 1]! }
}

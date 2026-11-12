/**
 * Rendimiento de cada vídeo DENTRO de un periodo (A-R16d.2), a partir del
 * informe de la YouTube Analytics API con `dimensions=video`. Lógica pura, sin
 * Nitro ni red, para probarla con tests unitarios.
 *
 * Distinción clave del requisito: lo que aquí sale es lo ocurrido EN el
 * periodo; el total acumulado del vídeo viene de la Data API (`youtube-videos`).
 *
 * Reglas ("no inventar datos"):
 *  - Una métrica que Google no da es `null`, nunca 0.
 *  - Google omite los vídeos sin actividad en el periodo: un vídeo que no
 *    aparece NO se rellena con ceros (la interfaz explica la ausencia).
 *  - El informe se pide ordenado por visualizaciones y con tope: si se llega al
 *    tope, la lista puede estar recortada y se avisa con `truncated`.
 */

import type { AnalyticsReport } from './youtube-period'

/** Máximo que permite la API en un informe por vídeo. */
export const VIDEO_REPORT_LIMIT = 200

export const VIDEO_PERFORMANCE_METRICS = 'views,estimatedMinutesWatched,likes,comments'

export interface VideoPerformance {
  id: string
  views: number | null
  estimatedMinutesWatched: number | null
  likes: number | null
  comments: number | null
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

/** Los ids de vídeo de YouTube: 11 caracteres de [A-Za-z0-9_-]. Cualquier otra cosa se descarta. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export function isVideoId(value: unknown): value is string {
  return typeof value === 'string' && VIDEO_ID.test(value)
}

export function parseVideoPerformance(report: AnalyticsReport): { videos: VideoPerformance[]; truncated: boolean } {
  const idx: Record<string, number> = {}
  ;(report.columnHeaders ?? []).forEach((h, i) => {
    if (h.name) idx[h.name] = i
  })
  if (!('video' in idx)) return { videos: [], truncated: false }

  const rows = report.rows ?? []
  const seen = new Set<string>()
  const videos: VideoPerformance[] = []
  for (const row of rows) {
    const id = String(row[idx.video!] ?? '')
    if (!isVideoId(id) || seen.has(id)) continue
    seen.add(id)
    const get = (name: string) => (name in idx ? numberOrNull(row[idx[name]!]) : null)
    videos.push({
      id,
      views: get('views'),
      estimatedMinutesWatched: get('estimatedMinutesWatched'),
      likes: get('likes'),
      comments: get('comments')
    })
  }
  return { videos, truncated: rows.length >= VIDEO_REPORT_LIMIT }
}

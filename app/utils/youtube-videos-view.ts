/**
 * Presentación de la lista de vídeos de YouTube (A-R16d): búsqueda, filtro por
 * fecha de publicación, orden e interacción. Pura y sin Vue, para probar las
 * reglas:
 *  - Un recuento ausente (`null`) NUNCA es 0: se muestra "—" con el motivo.
 *  - La interacción es un cálculo de FEEDMA: (me gusta + comentarios) ÷
 *    visualizaciones; si falta cualquiera de los tres datos, no se calcula.
 *  - Ordenar por un dato que falta deja esos vídeos al final, no los mezcla.
 */

/** Espejo de `VideoDto` en server/utils/youtube-videos.ts. */
export interface VideoDto {
  id: string
  title: string
  thumbnailUrl: string | null
  publishedAt: string | null
  durationSeconds: number | null
  viewCount: number | null
  likeCount: number | null
  commentCount: number | null
}

export type VideoSort = 'recent' | 'views' | 'engagement'
export type VideoRange = 'all' | '30' | '90' | '365'

export const VIDEO_SORTS: { value: VideoSort; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'views', label: 'Más vistos' },
  { value: 'engagement', label: 'Mayor interacción' }
]

export const VIDEO_RANGES: { value: VideoRange; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: '365', label: 'Último año' }
]

export const ENGAGEMENT_HINT = 'Interacción = (me gusta + comentarios) ÷ visualizaciones. Es un cálculo de FEEDMA, no una cifra de YouTube; no se calcula si el vídeo oculta los me gusta o tiene los comentarios desactivados.'

/** Sin tildes y en minúsculas, para que "video" encuentre "Vídeo". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Interacción en %, o `null` si falta cualquiera de los datos (o no hay visualizaciones que dividir). */
export function engagementRate(v: Pick<VideoDto, 'viewCount' | 'likeCount' | 'commentCount'>): number | null {
  if (v.viewCount === null || v.viewCount <= 0 || v.likeCount === null || v.commentCount === null) return null
  return ((v.likeCount + v.commentCount) / v.viewCount) * 100
}

export interface VideoFilters {
  query: string
  range: VideoRange
}

export function hasActiveFilters(f: VideoFilters): boolean {
  return f.query.trim() !== '' || f.range !== 'all'
}

/** Filtra por título (sin tildes ni mayúsculas) y por fecha de publicación. Sin fecha, un vídeo no entra en un filtro de fechas. */
export function filterVideos(list: VideoDto[], filters: VideoFilters, now: Date = new Date()): VideoDto[] {
  const q = normalizeText(filters.query)
  const since = filters.range === 'all' ? null : now.getTime() - Number(filters.range) * 86_400_000
  return list.filter((v) => {
    if (q && !normalizeText(v.title).includes(q)) return false
    if (since !== null) {
      if (!v.publishedAt) return false
      const t = new Date(v.publishedAt).getTime()
      if (!Number.isFinite(t) || t < since) return false
    }
    return true
  })
}

/** Orden estable; los vídeos sin el dato por el que se ordena van AL FINAL. No modifica la lista original. */
export function sortVideos(list: VideoDto[], sort: VideoSort): VideoDto[] {
  const key = (v: VideoDto): number | null => {
    if (sort === 'views') return v.viewCount
    if (sort === 'engagement') return engagementRate(v)
    if (!v.publishedAt) return null
    const t = new Date(v.publishedAt).getTime()
    return Number.isFinite(t) ? t : null
  }
  return list
    .map((v, i) => ({ v, i, k: key(v) }))
    .sort((a, b) => {
      if (a.k === null && b.k === null) return a.i - b.i
      if (a.k === null) return 1
      if (b.k === null) return -1
      return b.k - a.k || a.i - b.i
    })
    .map((x) => x.v)
}

export function videoUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
}

const oneDecimal = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })
const exact = new Intl.NumberFormat('es-ES')

export function formatEngagement(rate: number): string {
  return `${oneDecimal.format(rate)} %`
}

export interface CountDisplay {
  /** Valor para mostrar; "—" si no hay dato. */
  text: string
  /** Por qué no hay dato (solo si `text` es "—"). */
  reason: string | null
}

const REASONS = {
  views: 'YouTube no ha devuelto las visualizaciones de este vídeo',
  likes: 'El canal oculta los me gusta de este vídeo',
  comments: 'Los comentarios están desactivados en este vídeo'
} as const

export function countDisplay(kind: keyof typeof REASONS, value: number | null, compact: (n: number) => string = (n) => exact.format(n)): CountDisplay {
  return value === null ? { text: '—', reason: REASONS[kind] } : { text: compact(value), reason: null }
}

/** "4:13" / "1:02:05". */
export function formatVideoDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

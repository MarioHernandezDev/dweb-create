/**
 * Mapeo de los vídeos de YouTube Data API v3 a lo que consume el dashboard
 * (A-R16d). Lógica pura, sin Nitro ni red, para probarla con tests unitarios.
 *
 * Regla central ("no confundir ausencia con cero"): la API OMITE `likeCount`
 * si el canal oculta los me gusta y `commentCount` si desactiva los comentarios.
 * Aquí un campo ausente es `null`; un 0 real sigue siendo 0.
 */

export interface VideoDto {
  id: string
  title: string
  thumbnailUrl: string | null
  publishedAt: string | null
  /** Segundos; `null` si YouTube no da duración válida. */
  durationSeconds: number | null
  viewCount: number | null
  likeCount: number | null
  commentCount: number | null
}

export interface RawVideoItem {
  id?: string
  snippet?: { title?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } }; publishedAt?: string }
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
  contentDetails?: { duration?: string }
}

/** Los recuentos llegan como cadenas ("1234"). Ausente, vacío o no numérico -> `null`; "0" -> 0. */
export function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Duración ISO 8601 de YouTube a segundos: "PT4M13S" -> 253, "P1DT2H" -> 93600.
 * Ausente o ilegible -> `null` (antes se devolvía 0, que se mostraba como duración real).
 */
export function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!m) return null
  const [, d, h, min, s] = m
  if (d === undefined && h === undefined && min === undefined && s === undefined) return null
  return Number(d ?? 0) * 86_400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0)
}

export function mapVideo(item: RawVideoItem): VideoDto | null {
  if (!item.id) return null
  return {
    id: item.id,
    title: item.snippet?.title?.trim() || 'Sin título',
    thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
    publishedAt: item.snippet?.publishedAt ?? null,
    durationSeconds: parseIsoDuration(item.contentDetails?.duration),
    viewCount: numberOrNull(item.statistics?.viewCount),
    likeCount: numberOrNull(item.statistics?.likeCount),
    commentCount: numberOrNull(item.statistics?.commentCount)
  }
}

/** Más reciente primero; los que no tienen fecha, al final. `playlistItems` no garantiza el orden exacto. */
export function sortNewestFirst(videos: VideoDto[]): VideoDto[] {
  return [...videos].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
}

/** El `pageToken` viene del navegador y va a la URL de Google: solo caracteres de un token real y longitud acotada. */
export function isValidPageToken(token: unknown): token is string {
  return typeof token === 'string' && token.length > 0 && token.length <= 200 && /^[A-Za-z0-9_-]+$/.test(token)
}

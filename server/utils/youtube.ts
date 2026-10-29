import type { AnalyticsReport } from './youtube-period'

/**
 * Llamadas a la API de YouTube compartidas entre `youtube-sync.post.ts`
 * (botón "Actualizar" en Redes) y `youtube-channel-stats.get.ts` (el
 * detalle por red en Métricas) — antes de refrescar.get.ts duplicaba este
 * mismo refresco de token. Ninguna de las dos cachea nada: el access_token
 * de Google dura 1h, así que cada llamada pide uno nuevo con el
 * refresh_token (ver callback.get.ts, que es quien lo guarda cifrado).
 */

// Tope por llamada a Google — sin esto, una sola de la cadena que se quede
// colgada (red del servidor, cuota, lo que sea) deja la petición entera
// pendiente para siempre, con el spinner del cliente girando sin fin (el
// timeout del propio $fetch del cliente a nuestra API, en
// creator/metrics/[platform].vue, acaba cortándolo a los 20s, pero mejor
// que falle rápido y claro aquí mismo, por llamada).
const GOOGLE_FETCH_TIMEOUT_MS = 8_000

interface GoogleRefreshResponse {
  access_token: string
  expires_in: number
}

export async function refreshYoutubeAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  return await $fetch<GoogleRefreshResponse>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    timeout: GOOGLE_FETCH_TIMEOUT_MS,
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  })
}

export interface YoutubeChannelResponse {
  items?: {
    snippet?: { title?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } }; publishedAt?: string }
    statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string; hiddenSubscriberCount?: boolean }
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }[]
}

export async function fetchYoutubeChannel(accessToken: string) {
  return await $fetch<YoutubeChannelResponse>('https://www.googleapis.com/youtube/v3/channels', {
    params: { part: 'snippet,statistics,contentDetails', mine: 'true' },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: GOOGLE_FETCH_TIMEOUT_MS
  })
}

interface PlaylistItemsResponse {
  items?: { contentDetails?: { videoId?: string } }[]
}

/** Ids de los vídeos más recientes de la playlist de subidas del canal (sin sus stats todavía, eso es fetchYoutubeVideos). */
export async function fetchRecentUploadIds(accessToken: string, uploadsPlaylistId: string, maxResults = 8) {
  const res = await $fetch<PlaylistItemsResponse>('https://www.googleapis.com/youtube/v3/playlistItems', {
    params: { part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: GOOGLE_FETCH_TIMEOUT_MS
  })
  return (res.items ?? []).map((i) => i.contentDetails?.videoId).filter((id): id is string => !!id)
}

export interface YoutubeVideosResponse {
  items?: {
    id: string
    snippet?: { title?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } }; publishedAt?: string }
    statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
    contentDetails?: { duration?: string }
  }[]
}

export async function fetchYoutubeVideos(accessToken: string, ids: string[]) {
  if (!ids.length) return { items: [] } as YoutubeVideosResponse
  return await $fetch<YoutubeVideosResponse>('https://www.googleapis.com/youtube/v3/videos', {
    params: { part: 'snippet,statistics,contentDetails', id: ids.join(',') },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: GOOGLE_FETCH_TIMEOUT_MS
  })
}

export interface YoutubeAnalyticsDay {
  date: string
  views: number
  subscribersGained: number
  subscribersLost: number
}

interface YoutubeAnalyticsResponse {
  rows?: (string | number)[][]
}

/**
 * Histórico día a día real (YouTube Analytics API, distinta de la YouTube
 * Data API v3 que usa el resto de este archivo — necesita el scope
 * `yt-analytics.readonly`, ver start.get.ts). Si el token no lo tiene
 * (cuentas conectadas antes de añadir este permiso), Google devuelve un 403
 * aquí — quien llama a esto decide qué hacer con ese error, no se oculta.
 */
export async function fetchYoutubeAnalytics(accessToken: string, startDate: string, endDate: string): Promise<YoutubeAnalyticsDay[]> {
  const res = await $fetch<YoutubeAnalyticsResponse>('https://youtubeanalytics.googleapis.com/v2/reports', {
    params: {
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,subscribersGained,subscribersLost',
      dimensions: 'day',
      sort: 'day'
    },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: GOOGLE_FETCH_TIMEOUT_MS
  })
  return (res.rows ?? []).map((row) => ({
    date: String(row[0]),
    views: Number(row[1] ?? 0),
    subscribersGained: Number(row[2] ?? 0),
    subscribersLost: Number(row[3] ?? 0)
  }))
}

/**
 * Informe genérico de la YouTube Analytics API (A-R16b): el que llama elige
 * métricas y dimensión. Devuelve la respuesta tal cual (cabeceras + filas) para
 * que `server/utils/youtube-period.ts` la interprete por NOMBRE de columna.
 * Mismo permiso que el resto de Analytics (`yt-analytics.readonly`).
 */
export async function fetchYoutubeAnalyticsReport(
  accessToken: string,
  params: { startDate: string; endDate: string; metrics: string; dimensions?: string; sort?: string }
): Promise<AnalyticsReport> {
  return await $fetch<AnalyticsReport>('https://youtubeanalytics.googleapis.com/v2/reports', {
    params: { ids: 'channel==MINE', ...params },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: GOOGLE_FETCH_TIMEOUT_MS
  })
}

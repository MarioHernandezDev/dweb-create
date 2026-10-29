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
    id?: string
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

interface PlaylistPageResponse {
  items?: { contentDetails?: { videoId?: string } }[]
  nextPageToken?: string
  pageInfo?: { totalResults?: number }
}

/**
 * Una página de la lista de subidas del canal: los ids de los vídeos (sin sus
 * estadísticas todavía, eso es `fetchYoutubeVideos`), el token de la página
 * siguiente y el total de vídeos si YouTube lo da.
 */
export async function fetchUploadsPage(accessToken: string, uploadsPlaylistId: string, opts: { maxResults?: number; pageToken?: string } = {}) {
  const res = await $fetch<PlaylistPageResponse>('https://www.googleapis.com/youtube/v3/playlistItems', {
    params: {
      part: 'contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: opts.maxResults ?? 24,
      ...(opts.pageToken ? { pageToken: opts.pageToken } : {})
    },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: GOOGLE_FETCH_TIMEOUT_MS
  })
  return {
    ids: (res.items ?? []).map((i) => i.contentDetails?.videoId).filter((id): id is string => !!id),
    nextPageToken: res.nextPageToken ?? null,
    total: typeof res.pageInfo?.totalResults === 'number' ? res.pageInfo.totalResults : null
  }
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

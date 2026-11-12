import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  refresh_token_encrypted: string | null
  status: 'connected' | 'expired' | 'revoked' | 'missing_permissions'
}

const PAGE_SIZE = 24

/**
 * GET /api/social/youtube-videos[?pageToken=…] — vídeos subidos del canal del
 * usuario, de 24 en 24 (A-R16d). Sustituye a los 8 "recientes" que devolvía
 * `youtube-channel-stats`.
 *
 * Reglas (ver server/utils/youtube-videos.ts):
 *  - Un recuento que YouTube omite (me gusta ocultos, comentarios
 *    desactivados) es `null`, NUNCA 0.
 *  - Sin duración válida -> `null`, no 0.
 *  - `nextPageToken` se devuelve tal cual para pedir la página siguiente;
 *    el `pageToken` que llega del navegador se valida antes de usarlo.
 *
 * Solo devuelve datos del propio usuario autenticado; los tokens no salen del
 * servidor. Si la cuenta ya consta como caducada/revocada/sin permiso no se
 * llama a Google: se responde `reconnect_required` directamente.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'social-read', user.sub)

  const rawToken = getQuery(event).pageToken
  if (rawToken !== undefined && !isValidPageToken(rawToken)) {
    throw createError({ statusCode: 400, statusMessage: 'Token de página no válido.' })
  }
  const pageToken = rawToken as string | undefined

  const config = useRuntimeConfig(event)
  if (!config.socialTokenEncryptionKey || !config.youtubeClientId || !config.youtubeClientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'YouTube no está configurado todavía en el servidor.' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden ver estas estadísticas.' })

  const { data: account } = await client
    .from('social_accounts')
    .select('id, refresh_token_encrypted, status')
    .eq('creator_id', creator.id)
    .eq('platform', 'youtube')
    .maybeSingle<SocialAccountRow>()
  if (!account?.refresh_token_encrypted) throw createError({ statusCode: 404, statusMessage: 'No tienes YouTube conectado todavía.' })

  if (account.status !== 'connected') {
    throw toSocialHttpError('youtube', { kind: account.status, code: `stored_${account.status}`, httpStatus: null, reconnect: true })
  }

  try {
    const refreshToken = decryptToken(account.refresh_token_encrypted, config.socialTokenEncryptionKey)
    const refreshed = await refreshYoutubeAccessToken(refreshToken, config.youtubeClientId, config.youtubeClientSecret)

    const channelRes = await fetchYoutubeChannel(refreshed.access_token)
    const uploadsPlaylistId = channelRes.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    // Canal sin lista de subidas (no ha publicado nunca): lista vacía, no es un error.
    if (!uploadsPlaylistId) return { videos: [], nextPageToken: null, totalVideos: 0 }

    const page = await fetchUploadsPage(refreshed.access_token, uploadsPlaylistId, { maxResults: PAGE_SIZE, pageToken })
    const detail = await fetchYoutubeVideos(refreshed.access_token, page.ids)

    const videos = sortNewestFirst((detail.items ?? []).map(mapVideo).filter((v): v is VideoDto => v !== null))
    return { videos, nextPageToken: page.nextPageToken, totalVideos: page.total }
  } catch (err) {
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/youtube-videos] fallo al leer los vídeos:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('youtube', classified)
  }
})

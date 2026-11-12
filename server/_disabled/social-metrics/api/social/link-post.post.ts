import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface LinkBody {
  postId?: string
  url?: string
}

interface PostRow {
  id: string
  platform: string
}

interface AccountRow {
  id: string
  status: 'connected' | 'expired' | 'revoked' | 'missing_permissions'
  is_verified: boolean
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/social/link-post { postId, url } — vincula una publicación del
 * tablero con su contenido real en YouTube o Instagram (A-R7).
 *
 * Seguridad (por qué esto es un endpoint y no una escritura del navegador): el
 * creador podría escribir ids ajenos o falsos. Aquí el servidor
 *  1. comprueba que la publicación es del usuario y que su plataforma es YouTube o Instagram;
 *  2. lee el enlace con una lista cerrada de dominios y un id con forma exacta;
 *  3. **comprueba con el proveedor, con el token de la cuenta conectada, que el
 *     contenido pertenece a esa cuenta** (un vídeo ajeno o inexistente se rechaza
 *     con el mismo mensaje: no se confirma qué vídeos existen);
 *  4. y solo entonces escribe el vínculo con `service_role` (el navegador no puede).
 *
 * Si la publicación ya estaba vinculada a OTRO contenido, las métricas guardadas
 * del anterior se borran (describían otro contenido y mezclarlas sería inventar).
 * Instagram: la comprobación no se ha probado con una cuenta real.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceRateLimit(event, `link-post:${user.sub}`, 15, 60_000)

  const body = await readBody<LinkBody>(event)
  const postId = body?.postId
  const rawUrl = body?.url
  if (typeof postId !== 'string' || !UUID.test(postId)) throw createError({ statusCode: 400, statusMessage: 'Publicación no válida.' })
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) throw createError({ statusCode: 400, statusMessage: 'Pega el enlace del contenido.' })

  const config = useRuntimeConfig(event)
  const client = serverSupabaseServiceRole(event)

  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden vincular publicaciones.' })

  const { data: post } = await client.from('posts').select('id, platform').eq('id', postId).eq('creator_id', creator.id).maybeSingle<PostRow>()
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada.' })
  if (post.platform !== 'youtube' && post.platform !== 'instagram') {
    throw createError({ statusCode: 422, statusMessage: 'Solo se pueden vincular publicaciones de YouTube o Instagram.' })
  }
  const platform = post.platform as 'youtube' | 'instagram'
  const label = platform === 'youtube' ? 'YouTube' : 'Instagram'

  const { data: account } = await client
    .from('social_accounts')
    .select('id, status, is_verified, access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('creator_id', creator.id)
    .eq('platform', platform)
    .maybeSingle<AccountRow>()
  if (!account?.is_verified) throw createError({ statusCode: 404, statusMessage: `Conecta tu cuenta de ${label} antes de vincular contenido.` })
  if (account.status !== 'connected') {
    throw toSocialHttpError(platform, { kind: account.status, code: `stored_${account.status}`, httpStatus: null, reconnect: true })
  }

  const videoId = platform === 'youtube' ? parseYoutubeVideoId(rawUrl) : null
  const shortcode = platform === 'instagram' ? parseInstagramShortcode(rawUrl) : null
  if (!videoId && !shortcode) {
    throw createError({
      statusCode: 400,
      statusMessage: platform === 'youtube'
        ? 'Ese enlace no es de un vídeo de YouTube. Pega el enlace del vídeo (youtube.com/watch?v=… o youtu.be/…).'
        : 'Ese enlace no es de una publicación de Instagram. Pega el enlace de la publicación o del reel.'
    })
  }
  const notFound = createError({ statusCode: 404, statusMessage: `No hemos encontrado ese contenido en tu cuenta de ${label} conectada. Comprueba que es tuyo y que el enlace es correcto.` })

  let external: { id: string; url: string }
  let accessToken = ''
  try {
    if (platform === 'youtube') {
      if (!account.refresh_token_encrypted || !config.socialTokenEncryptionKey || !config.youtubeClientId || !config.youtubeClientSecret) {
        throw createError({ statusCode: 500, statusMessage: 'YouTube no está configurado todavía en el servidor.' })
      }
      const refreshToken = decryptToken(account.refresh_token_encrypted, config.socialTokenEncryptionKey)
      const refreshed = await refreshYoutubeAccessToken(refreshToken, config.youtubeClientId, config.youtubeClientSecret)
      const [channelRes, detail] = await Promise.all([fetchYoutubeChannel(refreshed.access_token), fetchYoutubeVideos(refreshed.access_token, [videoId!])])
      const raw = detail.items?.[0]
      const ownChannelId = channelRes.items?.[0]?.id
      // La Data API devuelve cualquier vídeo público: lo que prueba la propiedad es que el canal del vídeo sea el nuestro.
      if (!raw || !ownChannelId || raw.snippet?.channelId !== ownChannelId) throw notFound
      external = { id: raw.id, url: YOUTUBE_WATCH_URL(raw.id) }
      accessToken = refreshed.access_token
      await recordSyncSuccess(client, account.id, {
        access_token_encrypted: encryptToken(refreshed.access_token, config.socialTokenEncryptionKey),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      })
    } else {
      if (!account.access_token_encrypted || !config.socialTokenEncryptionKey) {
        throw createError({ statusCode: 500, statusMessage: 'Instagram no está configurado todavía en el servidor.' })
      }
      if (instagramRefreshDecision(account.token_expires_at, new Date()) === 'expired') {
        // Mismo error que devolvería Meta (190): se clasifica como acceso caducado y se guarda el estado.
        throw Object.assign(new Error('Token de Instagram caducado (fecha de caducidad superada).'), { response: { status: 400 }, data: { error: { code: 190, error_subcode: 463 } } })
      }
      accessToken = decryptToken(account.access_token_encrypted, config.socialTokenEncryptionKey)
      const found = await findInstagramMedia(accessToken, shortcode!)
      if (!found) throw notFound
      external = { id: found.id, url: found.permalink }
    }
  } catch (err) {
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/link-post] fallo al verificar el contenido:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError(platform, classified)
  }

  const saved = await saveExternalLink(client, { postId: post.id, accountId: account.id, platform, externalId: external.id, externalUrl: external.url })
  if (!saved.ok) {
    if (saved.reason === 'duplicate') throw createError({ statusCode: 409, statusMessage: 'Ese contenido ya está vinculado a otra publicación tuya.' })
    throw createError({ statusCode: 500, statusMessage: 'No se ha podido guardar el vínculo. Inténtalo de nuevo.' })
  }
  // Primera lectura de métricas (A-R8b): si falla, el vínculo ya está bien guardado y se podrá actualizar después.
  try {
    const ref = [{ postId: post.id, externalId: external.id }]
    if (platform === 'youtube') await refreshYoutubePostMetrics(client, account.id, accessToken, ref)
    else await refreshInstagramPostMetrics(client, account.id, accessToken, ref)
  } catch (err) {
    console.error('[social/link-post] no se pudieron leer las métricas al vincular (se puede actualizar después):', describeErrorForLog(err))
  }

  return { link: saved.link }
})

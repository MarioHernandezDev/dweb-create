import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * GET /api/auth/youtube/callback — a donde Google redirige tras el login
 * (ver docs/10-YOUTUBE-OAUTH-SETUP.md). Dos llamadas server-to-server en
 * cadena, ambas con `client_secret` de por medio — por eso no se puede hacer
 * nada de esto desde el navegador:
 *
 * 1. `code` -> tokens (oauth2.googleapis.com/token): access_token (1h) +
 *    refresh_token (no caduca salvo que se revoque, gracias a
 *    `access_type=offline` + `prompt=consent` en start.get.ts).
 * 2. Ese access_token -> datos del canal propio
 *    (youtube/v3/channels?mine=true): nombre y estadísticas (suscriptores,
 *    vistas totales, nº de vídeos).
 *
 * El refresh_token se cifra (`encryptToken`) antes de guardarlo — nunca en
 * texto plano. El access_token también se guarda cifrado, aunque dura solo
 * 1h, por si algo lo usa antes de la primera sincronización manual (ver
 * youtube-sync.post.ts, que lo refresca solo cuando toca).
 */

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
}

interface YoutubeChannelsResponse {
  items?: {
    id?: string
    snippet?: { title?: string }
    statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string; hiddenSubscriberCount?: boolean }
  }[]
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig(event)

  const redirectWithError = (reason: string) =>
    sendRedirect(event, appRedirectUrl(config.appUrl, `/creator/socials?youtube=error&reason=${encodeURIComponent(reason)}`))

  if (query.error) {
    const reason = typeof query.error_description === 'string' ? query.error_description : String(query.error)
    return redirectWithError(reason)
  }

  const code = query.code
  const state = query.state
  if (typeof code !== 'string' || typeof state !== 'string') {
    return redirectWithError('Falta el código de autorización de Google.')
  }

  const creatorId = verifyOAuthState(state, config.socialTokenEncryptionKey)
  if (!creatorId) {
    return redirectWithError('La sesión de conexión caducó o no es válida. Inténtalo otra vez.')
  }

  try {
    const tokens = await $fetch<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: config.youtubeClientId,
        client_secret: config.youtubeClientSecret,
        redirect_uri: config.youtubeRedirectUri,
        grant_type: 'authorization_code'
      })
    })

    // Sin refresh_token no hay forma de seguir leyendo el canal pasada 1h —
    // pasaría con `prompt=consent` ausente en una segunda autorización de la
    // MISMA cuenta de Google que ya autorizó antes antes de ese cambio.
    if (!tokens.refresh_token) {
      return redirectWithError('Google no ha concedido permiso de acceso continuado. Revoca el acceso de FEEDMA en myaccount.google.com/permissions y vuelve a intentarlo.')
    }

    const channels = await $fetch<YoutubeChannelsResponse>('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'snippet,statistics', mine: 'true' },
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const channel = channels.items?.[0]
    if (!channel) {
      return redirectWithError('Esa cuenta de Google no tiene ningún canal de YouTube.')
    }

    // Si el creador ocultó su contador de suscriptores (ajuste propio de
    // YouTube), `subscriberCount` llega como "0" y `hiddenSubscriberCount`
    // en `true` — en ese caso no se guarda un 0 falso, se deja como estaba.
    const subscriberCount: number | undefined = channel.statistics?.hiddenSubscriberCount
      ? undefined
      : Number(channel.statistics?.subscriberCount ?? 'NaN')
    const hasValidSubscriberCount = typeof subscriberCount === 'number' && Number.isFinite(subscriberCount)

    const encryptedAccess = encryptToken(tokens.access_token, config.socialTokenEncryptionKey)
    const encryptedRefresh = encryptToken(tokens.refresh_token, config.socialTokenEncryptionKey)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const client = serverSupabaseServiceRole(event)
    const { error } = await client
      .from('social_accounts')
      .upsert({
        creator_id: creatorId,
        platform: 'youtube',
        handle: channel.snippet?.title ?? null,
        ...(hasValidSubscriberCount ? { followers_count: subscriberCount } : {}),
        access_token_encrypted: encryptedAccess,
        refresh_token_encrypted: encryptedRefresh,
        token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        // Id del canal: permite localizar la fila y impide conectar el mismo
        // canal a dos creadores.
        external_account_id: channel.id ?? null,
        ...successPatch()
      } as never, { onConflict: 'creator_id,platform' })
    // 23505 = el mismo canal de YouTube ya está conectado a otro creador.
    if (error?.code === '23505') return redirectWithError('Ese canal de YouTube ya está conectado a otro usuario de FEEDMA.')
    if (error) throw error

    return sendRedirect(event, appRedirectUrl(config.appUrl, '/creator/socials?youtube=connected'))
  } catch (err) {
    console.error('[auth/youtube/callback] fallo al completar el OAuth:', describeErrorForLog(err))
    return redirectWithError('No se ha podido completar la conexión con YouTube. Inténtalo otra vez.')
  }
})

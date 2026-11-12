import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * GET /api/auth/instagram/callback — a donde Instagram redirige tras el
 * login (ver docs/9-INSTAGRAM-OAUTH-SETUP.md). Tres llamadas server-to-server
 * en cadena, todas con `client_secret` de por medio — por eso no se puede
 * hacer nada de esto desde el navegador:
 *
 * 1. `code` -> token de corta duración (api.instagram.com/oauth/access_token).
 * 2. Token corto -> token de larga duración, 60 días (graph.instagram.com/access_token).
 * 3. Perfil básico (graph.instagram.com/.../me) con ese token.
 *
 * El token final se cifra (`encryptToken`) antes de guardarlo — nunca en
 * texto plano, ni siquiera con la service_role key de por medio.
 *
 * Con el scope `instagram_business_manage_insights` ya pedido (ver
 * start.get.ts), `followers_count` viene en el mismo `/me` que el perfil —
 * no hace falta una llamada aparte para esto. Métricas más allá de
 * seguidores (alcance, interacciones...) sí viven en su propia ruta, ver
 * server/api/social/instagram-sync.post.ts.
 */

interface ShortLivedTokenResponse {
  access_token: string
  user_id: string
}

interface LongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface InstagramProfile {
  id: string
  username: string
  account_type?: string
  followers_count?: number
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig(event)

  const redirectWithError = (reason: string) =>
    sendRedirect(event, appRedirectUrl(config.appUrl, `/creator/metrics?instagram=error&reason=${encodeURIComponent(reason)}`))

  if (query.error) {
    const reason = typeof query.error_description === 'string' ? query.error_description : String(query.error)
    return redirectWithError(reason)
  }

  const code = query.code
  const state = query.state
  if (typeof code !== 'string' || typeof state !== 'string') {
    return redirectWithError('Falta el código de autorización de Instagram.')
  }

  const creatorId = verifyOAuthState(state, config.socialTokenEncryptionKey)
  if (!creatorId) {
    return redirectWithError('La sesión de conexión caducó o no es válida. Inténtalo otra vez.')
  }

  try {
    const shortLived = await $fetch<ShortLivedTokenResponse>('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: config.instagramAppId,
        client_secret: config.instagramAppSecret,
        grant_type: 'authorization_code',
        redirect_uri: config.instagramRedirectUri,
        code
      })
    })

    const longLived = await $fetch<LongLivedTokenResponse>('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: config.instagramAppSecret,
        access_token: shortLived.access_token
      }
    })

    // `followers_count` solo lo da de verdad el campo si el token tiene
    // `instagram_business_manage_insights` — si el usuario autorizó sin ese
    // permiso (versión vieja de la pantalla de consentimiento ya aceptada
    // antes de añadirlo), Instagram simplemente omite el campo en vez de
    // dar error; se queda en `undefined` y el upsert de abajo no lo pisa.
    const profile = await $fetch<InstagramProfile>('https://graph.instagram.com/v21.0/me', {
      params: { fields: 'id,username,account_type,followers_count', access_token: longLived.access_token }
    })

    const encrypted = encryptToken(longLived.access_token, config.socialTokenEncryptionKey)
    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString()

    const client = serverSupabaseServiceRole(event)
    const { error } = await client
      .from('social_accounts')
      .upsert({
        creator_id: creatorId,
        platform: 'instagram',
        handle: profile.username,
        ...(profile.followers_count !== undefined ? { followers_count: profile.followers_count } : {}),
        access_token_encrypted: encrypted,
        // Instagram no da un refresh_token aparte: el propio token de larga
        // duración se "refresca" contra sí mismo (grant_type=ig_refresh_token).
        // Se guarda igual en las dos columnas para no inventar un esquema
        // nuevo solo para esta plataforma.
        refresh_token_encrypted: encrypted,
        token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        // Id de la cuenta en Instagram: permite que Meta localice la fila al
        // desautorizar (A-R4) e impide conectar la misma cuenta a dos creadores.
        external_account_id: profile.id,
        ...successPatch()
      } as never, { onConflict: 'creator_id,platform' })
    // 23505 = la misma cuenta de Instagram ya está conectada a otro creador.
    if (error?.code === '23505') return redirectWithError('Esa cuenta de Instagram ya está conectada a otro usuario de CIBERAN.')
    if (error) throw error

    return sendRedirect(event, appRedirectUrl(config.appUrl, '/creator/metrics?instagram=connected'))
  } catch (err) {
    console.error('[auth/instagram/callback] fallo al completar el OAuth:', describeErrorForLog(err))
    return redirectWithError('No se ha podido completar la conexión con Instagram. Inténtalo otra vez.')
  }
})

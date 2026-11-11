import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * GET /api/auth/youtube/start — arranca el OAuth real de YouTube (Fase 4,
 * ver docs/10-YOUTUBE-OAUTH-SETUP.md). El navegador navega aquí entero (no
 * es un `$fetch` desde el cliente) porque el siguiente paso es un redirect
 * 302 a accounts.google.com — no se puede hacer con una petición AJAX.
 *
 * `access_type=offline` + `prompt=consent`: Google solo entrega un
 * `refresh_token` la primera vez que una cuenta autoriza, salvo que se fuerce
 * la pantalla de consentimiento cada vez con `prompt=consent` — sin esto, si
 * el creador ya había autorizado antes (p. ej. probando), Google no
 * devolvería refresh_token en el callback y la cuenta se quedaría sin forma
 * de refrescar el token pasada una hora.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'oauth-start', user.sub)

  const config = useRuntimeConfig(event)
  if (!config.youtubeClientId || !config.socialTokenEncryptionKey) {
    throw createError({ statusCode: 500, statusMessage: 'YouTube no está configurado todavía (faltan variables de entorno — ver docs/10-YOUTUBE-OAUTH-SETUP.md).' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data: creator } = await client
    .from('creators')
    .select('id')
    .eq('profile_id', user.sub)
    .maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden conectar redes sociales.' })

  const state = createOAuthState(creator.id, config.socialTokenEncryptionKey)

  const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authorizeUrl.searchParams.set('client_id', config.youtubeClientId)
  authorizeUrl.searchParams.set('redirect_uri', config.youtubeRedirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  // Solo lectura: identifica el canal y permite leer sus estadísticas
  // (suscriptores, vistas totales, nº de vídeos) — nada de subir ni
  // gestionar contenido (ver "Publicar contenido desde la app" en
  // docs/9-INSTAGRAM-OAUTH-SETUP.md §5, misma decisión de producto aquí).
  // `yt-analytics.readonly` es lo que permite leer el HISTÓRICO día a día
  // (vistas, suscriptores ganados/perdidos) para la gráfica de evolución en
  // /creator/metrics/youtube — es una API distinta (YouTube Analytics API,
  // ver docs/10-YOUTUBE-OAUTH-SETUP.md) y hay que habilitarla aparte en
  // Google Cloud. Las cuentas que ya conectaron ANTES de este cambio no
  // tienen este permiso en su token — youtube-channel-stats.get.ts lo
  // detecta solo y pide reconectar, no rompe nada para quien no lo haga.
  authorizeUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly')
  authorizeUrl.searchParams.set('access_type', 'offline')
  authorizeUrl.searchParams.set('prompt', 'consent')
  authorizeUrl.searchParams.set('state', state)

  return sendRedirect(event, authorizeUrl.toString())
})

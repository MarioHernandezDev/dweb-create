import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * GET /api/auth/instagram/start — arranca el OAuth real de Instagram (Fase
 * 4, ver docs/9-INSTAGRAM-OAUTH-SETUP.md). El navegador navega aquí entero
 * (no es un `$fetch` desde el cliente) porque el siguiente paso es un
 * redirect 302 a instagram.com — no se puede hacer con una petición AJAX.
 *
 * "Instagram API with Instagram Login": habla directo con la cuenta de
 * Instagram (tiene que ser profesional — Creator o Business, no Personal),
 * sin pasar por una Página de Facebook.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })

  const config = useRuntimeConfig(event)
  if (!config.instagramAppId || !config.socialTokenEncryptionKey) {
    throw createError({ statusCode: 500, statusMessage: 'Instagram no está configurado todavía (faltan variables de entorno — ver docs/9-INSTAGRAM-OAUTH-SETUP.md).' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data: creator } = await client
    .from('creators')
    .select('id')
    .eq('profile_id', user.sub)
    .maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden conectar redes sociales.' })

  const state = createOAuthState(creator.id, config.socialTokenEncryptionKey)

  const authorizeUrl = new URL('https://www.instagram.com/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', config.instagramAppId)
  authorizeUrl.searchParams.set('redirect_uri', config.instagramRedirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  // `instagram_business_basic` identifica la cuenta y permite refrescar el
  // token. `instagram_business_manage_insights` es lo que de verdad trae
  // seguidores y métricas (ver callback.get.ts e
  // instagram-metrics.post.ts) — nada de publicar ni de mensajes/comentarios,
  // que esta app no usa.
  authorizeUrl.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights')
  authorizeUrl.searchParams.set('state', state)

  return sendRedirect(event, authorizeUrl.toString())
})

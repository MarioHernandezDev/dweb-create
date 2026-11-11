import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  refresh_token_encrypted: string | null
}

/**
 * POST /api/social/youtube-sync — refresco manual del número de
 * suscriptores (botón "Actualizar" en Redes), mismo patrón que
 * instagram-sync.post.ts. El refresco de token y las llamadas a la API
 * viven en server/utils/youtube.ts y la lógica de una cuenta en
 * server/utils/social-sync.ts, compartida con la sincronización programada
 * (`sync-all.post.ts`) y con youtube-channel-stats.get.ts (el detalle por
 * red en Métricas).
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'social-sync', user.sub)

  const config = useRuntimeConfig(event)
  if (!config.socialTokenEncryptionKey || !config.youtubeClientId || !config.youtubeClientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'YouTube no está configurado todavía en el servidor.' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden sincronizar redes sociales.' })

  const { data: account } = await client
    .from('social_accounts')
    .select('id, refresh_token_encrypted')
    .eq('creator_id', creator.id)
    .eq('platform', 'youtube')
    .maybeSingle<SocialAccountRow>()
  if (!account?.refresh_token_encrypted) throw createError({ statusCode: 404, statusMessage: 'No tienes YouTube conectado todavía.' })

  try {
    const result = await syncYoutubeAccount(
      client,
      { id: account.id, refresh_token_encrypted: account.refresh_token_encrypted },
      { socialTokenEncryptionKey: config.socialTokenEncryptionKey, youtubeClientId: config.youtubeClientId, youtubeClientSecret: config.youtubeClientSecret }
    )
    return { followersCount: result.followersCount }
  } catch (err) {
    // Errores ya controlados (422, 500 al guardar): se devuelven tal cual.
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/youtube-sync] fallo al sincronizar:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('youtube', classified)
  }
})

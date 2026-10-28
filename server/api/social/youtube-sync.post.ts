import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  refresh_token_encrypted: string
}

/**
 * POST /api/social/youtube-sync — refresco manual del número de
 * suscriptores (botón "Actualizar" en Redes), mismo patrón que
 * instagram-sync.post.ts. El refresco de token y las llamadas a la API
 * viven en server/utils/youtube.ts, compartidas con
 * youtube-channel-stats.get.ts (el detalle por red en Métricas).
 *
 * Sin cron todavía que lo haga solo — ver el mismo hueco documentado en
 * docs/9-INSTAGRAM-OAUTH-SETUP.md §5 para Instagram.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })

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
  if (!account) throw createError({ statusCode: 404, statusMessage: 'No tienes YouTube conectado todavía.' })

  const refreshToken = decryptToken(account.refresh_token_encrypted, config.socialTokenEncryptionKey)

  try {
    const refreshed = await refreshYoutubeAccessToken(refreshToken, config.youtubeClientId, config.youtubeClientSecret)
    const channels = await fetchYoutubeChannel(refreshed.access_token)
    const stats = channels.items?.[0]?.statistics
    if (!stats || stats.hiddenSubscriberCount) {
      throw createError({
        statusCode: 422,
        statusMessage: 'YouTube no ha devuelto el número de suscriptores — puede que el canal los tenga ocultos en su configuración.'
      })
    }

    const subscriberCount = Number(stats.subscriberCount ?? 'NaN')
    if (!Number.isFinite(subscriberCount)) {
      throw createError({ statusCode: 422, statusMessage: 'YouTube ha devuelto un número de suscriptores inválido.' })
    }

    const { error } = await client
      .from('social_accounts')
      .update({
        followers_count: subscriberCount,
        access_token_encrypted: encryptToken(refreshed.access_token, config.socialTokenEncryptionKey),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      } as never)
      .eq('id', account.id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    return { followersCount: subscriberCount }
  } catch (err) {
    // Errores ya controlados arriba (422, 500 al guardar): se devuelven tal cual.
    if (isError(err)) throw err
    console.error('[social/youtube-sync] fallo al sincronizar:', describeErrorForLog(err))
    throw toSocialHttpError('youtube', classifyProviderError(err))
  }
})

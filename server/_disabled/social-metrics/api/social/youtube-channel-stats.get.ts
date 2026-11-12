import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  refresh_token_encrypted: string
}

export interface YoutubeChannelStats {
  /** Id del canal en YouTube (para el enlace "Ver en YouTube"); no es un secreto. */
  channelId: string | null
  title: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
  subscriberCount: number | null
  viewCount: number
  videoCount: number
  avgViewsPerVideo: number
}

/**
 * GET /api/social/youtube-channel-stats — la cabecera y los totales del canal
 * en /creator/metrics/youtube: nombre, avatar, id, suscriptores, vistas
 * totales, nº de vídeos y media de vistas por vídeo. En vivo, sin caché — mismo
 * criterio que el resto de la app con datos de redes sociales (ver
 * useMySocialAccounts.ts). El informe por periodos y la evolución los da
 * `youtube-analytics.get.ts`; la lista de vídeos, `youtube-videos.get.ts`.
 *
 * De paso, igual que youtube-sync.post.ts, aprovecha el token ya refrescado
 * para dejar `followers_count` al día en la base de datos.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'social-read', user.sub)

  const config = useRuntimeConfig(event)
  if (!config.socialTokenEncryptionKey || !config.youtubeClientId || !config.youtubeClientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'YouTube no está configurado todavía en el servidor.' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden ver estas estadísticas.' })

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
    const channelRes = await fetchYoutubeChannel(refreshed.access_token)
    const channel = channelRes.items?.[0]
    if (!channel) throw createError({ statusCode: 404, statusMessage: 'No se ha encontrado el canal de YouTube.' })

    const viewCount = Number(channel.statistics?.viewCount ?? 0)
    const videoCount = Number(channel.statistics?.videoCount ?? 0)
    const subscriberCount: number | null = channel.statistics?.hiddenSubscriberCount
      ? null
      : Number(channel.statistics?.subscriberCount ?? 'NaN')
    const hasValidSubscriberCount = typeof subscriberCount === 'number' && Number.isFinite(subscriberCount)

    const stats: YoutubeChannelStats = {
      channelId: channel.id ?? null,
      title: channel.snippet?.title ?? null,
      thumbnailUrl: channel.snippet?.thumbnails?.high?.url ?? channel.snippet?.thumbnails?.default?.url ?? null,
      publishedAt: channel.snippet?.publishedAt ?? null,
      subscriberCount: hasValidSubscriberCount ? subscriberCount : null,
      viewCount,
      videoCount,
      avgViewsPerVideo: videoCount > 0 ? Math.round(viewCount / videoCount) : 0
    }

    // Aprovecha el token ya refrescado para dejar la fila al día — no hace
    // falta que el usuario pulse "Actualizar" en Redes aparte si ya ha
    // visitado el detalle, que siempre pide datos frescos.
    const { error } = await client
      .from('social_accounts')
      .update({
        ...(typeof stats.subscriberCount === 'number' ? { followers_count: stats.subscriberCount } : {}),
        access_token_encrypted: encryptToken(refreshed.access_token, config.socialTokenEncryptionKey),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        ...successPatch()
      } as never)
      .eq('id', account.id)
    if (error) console.error('[social/youtube-channel-stats] fallo al refrescar la fila (se devuelven los datos igual):', error.message)

    // Histórico propio (A-R8a): cada visita con datos correctos deja el snapshot del día (idempotente).
    // Así el histórico avanza aunque todavía no haya sincronización programada.
    await recordAccountSnapshot(client, account.id, snapshotFromYoutube(channel.statistics))

    return stats
  } catch (err) {
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/youtube-channel-stats] fallo al leer las estadísticas:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('youtube', classified)
  }
})

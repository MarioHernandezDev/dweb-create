import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  refresh_token_encrypted: string
}

export interface YoutubeRecentVideo {
  id: string
  title: string
  thumbnailUrl: string | null
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  durationSeconds: number
}

export interface YoutubeChannelStats {
  title: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
  subscriberCount: number | null
  viewCount: number
  videoCount: number
  avgViewsPerVideo: number
  recentVideos: YoutubeRecentVideo[]
  /**
   * Histórico real día a día de los últimos 28 días (YouTube Analytics
   * API) — `null` si el token no tiene el permiso `yt-analytics.readonly`
   * todavía (cuentas conectadas antes de añadir ese scope, ver
   * start.get.ts): no es un error que rompa el resto del detalle, solo
   * significa que hay que reconectar la cuenta en Redes para verlo.
   */
  evolution: { date: string; views: number; subscribersGained: number; subscribersLost: number }[] | null
  /**
   * Por qué falta `evolution`: `reconnect` = hay que reconectar (falta el
   * permiso o el acceso se revocó); `temporary` = fallo pasajero (cuota,
   * red) y NO hace falta reconectar; `null` = hay histórico.
   */
  evolutionIssue: 'reconnect' | 'temporary' | null
}

/** "PT4M13S" -> 253 (segundos). YouTube siempre devuelve la duración en este formato ISO 8601. */
function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const [, h, m, s] = match
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * GET /api/social/youtube-channel-stats — el detalle "chulo" por red en
 * /creator/metrics/youtube: no solo suscriptores, también vistas totales,
 * nº de vídeos, media de vistas por vídeo, los últimos vídeos subidos con
 * sus propias estadísticas reales, y el histórico día a día de los últimos
 * 28 días (para la gráfica de evolución). Todo en vivo, sin caché — mismo
 * criterio que el resto de la app con datos de redes sociales (ver
 * useMySocialAccounts.ts).
 *
 * De paso, igual que youtube-sync.post.ts, aprovecha el token ya refrescado
 * para dejar `followers_count` al día en la base de datos.
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

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
    const recentIds = uploadsPlaylistId ? await fetchRecentUploadIds(refreshed.access_token, uploadsPlaylistId, 8) : []
    const videosRes = recentIds.length ? await fetchYoutubeVideos(refreshed.access_token, recentIds) : { items: [] }

    const recentVideos: YoutubeRecentVideo[] = (videosRes.items ?? []).map((v) => ({
      id: v.id,
      title: v.snippet?.title ?? 'Sin título',
      thumbnailUrl: v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.default?.url ?? null,
      publishedAt: v.snippet?.publishedAt ?? new Date().toISOString(),
      viewCount: Number(v.statistics?.viewCount ?? 0),
      likeCount: Number(v.statistics?.likeCount ?? 0),
      commentCount: Number(v.statistics?.commentCount ?? 0),
      durationSeconds: parseIsoDuration(v.contentDetails?.duration)
    }))
    // playlistItems.list no garantiza el orden exacto en algunas cuentas —
    // se ordena aquí a propósito, más reciente primero.
    recentVideos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

    // YouTube Analytics tiene 1-2 días de retraso de procesado — pedir
    // "hasta hoy" devolvería días vacíos al final. `endDate` = hace 2 días,
    // 28 días hacia atrás desde ahí.
    let evolution: YoutubeChannelStats['evolution'] = null
    let evolutionIssue: YoutubeChannelStats['evolutionIssue'] = null
    let analyticsFailure: ReturnType<typeof classifyProviderError> | null = null
    try {
      const end = new Date(Date.now() - 2 * 86_400_000)
      const start = new Date(end.getTime() - 27 * 86_400_000)
      evolution = await fetchYoutubeAnalytics(refreshed.access_token, isoDate(start), isoDate(end))
    } catch (err) {
      // No es un fallo del endpoint entero. Se distingue por qué falta el
      // histórico: sin el permiso `yt-analytics.readonly` (o con el acceso
      // revocado) hay que reconectar; un corte de red o una cuota agotada
      // es pasajero y NO debe pedirle nada al usuario.
      const classified = classifyProviderError(err)
      console.error('[social/youtube-channel-stats] sin histórico:', describeErrorForLog(err))
      evolution = null
      evolutionIssue = classified.reconnect ? 'reconnect' : 'temporary'
      analyticsFailure = classified
    }

    const stats: YoutubeChannelStats = {
      title: channel.snippet?.title ?? null,
      thumbnailUrl: channel.snippet?.thumbnails?.high?.url ?? channel.snippet?.thumbnails?.default?.url ?? null,
      publishedAt: channel.snippet?.publishedAt ?? null,
      subscriberCount: hasValidSubscriberCount ? subscriberCount : null,
      viewCount,
      videoCount,
      avgViewsPerVideo: videoCount > 0 ? Math.round(viewCount / videoCount) : 0,
      recentVideos,
      evolution,
      evolutionIssue
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
        // Si lo único que falló fue el permiso de analíticas, la cuenta queda
        // marcada para reconectar; un fallo pasajero no cambia su estado.
        ...(analyticsFailure?.reconnect ? failurePatch(analyticsFailure) : successPatch())
      } as never)
      .eq('id', account.id)
    if (error) console.error('[social/youtube-channel-stats] fallo al refrescar la fila (se devuelven los datos igual):', error.message)

    return stats
  } catch (err) {
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/youtube-channel-stats] fallo al leer las estadísticas:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('youtube', classified)
  }
})

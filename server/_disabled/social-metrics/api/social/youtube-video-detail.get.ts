import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  refresh_token_encrypted: string | null
  status: 'connected' | 'expired' | 'revoked' | 'missing_permissions'
}

// Sin `subscribersLost`: no se ha confirmado que el informe de un solo vídeo lo admita, y una métrica rechazada tumbaría todo el detalle.
const TOTAL_METRICS = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained'
const DAY_METRICS = 'views,estimatedMinutesWatched'

/**
 * GET /api/social/youtube-video-detail?id=VIDEO&days=7|28|90|365 — detalle de
 * UN vídeo del canal del usuario en el periodo (A-R16d.3), en vivo desde la
 * YouTube Analytics API con `filters=video==ID` (totales, periodo anterior y
 * serie día a día). No guarda nada en la base de datos.
 *
 * Reglas:
 *  - El id se valida (11 caracteres de un id de YouTube) y se COMPRUEBA que el
 *    vídeo pertenece al canal del usuario ANTES de pedir Analytics: la Data API
 *    devuelve cualquier vídeo público, y una consulta de Analytics sobre un
 *    vídeo ajeno fallaría con 403 y marcaría por error la cuenta como "sin permiso".
 *  - Un dato que Google no da es `null`, nunca 0; los días sin fila no se rellenan.
 *  - Si el vídeo se publicó DENTRO del periodo (`partialPeriod`), las cifras
 *    cubren solo desde su publicación y no se compara con el periodo anterior.
 *
 * Solo datos del propio usuario autenticado; los tokens no salen del servidor.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'social-read', user.sub)

  const query = getQuery(event)
  const videoId = query.id
  if (!isVideoId(videoId)) throw createError({ statusCode: 400, statusMessage: 'Identificador de vídeo no válido.' })
  const days = Number(query.days ?? 28)
  if (!isPeriodDays(days)) {
    throw createError({ statusCode: 400, statusMessage: 'El periodo debe ser 7, 28, 90 o 365 días.' })
  }

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
    const accessToken = refreshed.access_token

    const [channelRes, detail] = await Promise.all([fetchYoutubeChannel(accessToken), fetchYoutubeVideos(accessToken, [videoId])])
    const raw = detail.items?.[0]
    const ownChannelId = channelRes.items?.[0]?.id
    // Mismo mensaje para "no existe" y "no es tuyo": no se confirma la existencia de vídeos ajenos.
    if (!raw || !ownChannelId || raw.snippet?.channelId !== ownChannelId) {
      throw createError({ statusCode: 404, statusMessage: 'No se ha encontrado ese vídeo en tu canal.' })
    }
    const video = mapVideo(raw)!

    const now = new Date()
    const availability = availablePeriods(video.publishedAt, now).find((p) => p.days === days)!
    const range = periodRanges(now, days)
    const comparable = availability.comparable
    const filters = `video==${videoId}`
    const seriesStart = comparable ? range.previousStart : range.start

    const [totalsCurrentRes, totalsPreviousRes, seriesRes] = await Promise.all([
      fetchYoutubeAnalyticsReport(accessToken, { startDate: range.start, endDate: range.end, metrics: TOTAL_METRICS, filters }),
      comparable
        ? fetchYoutubeAnalyticsReport(accessToken, { startDate: range.previousStart, endDate: range.previousEnd, metrics: TOTAL_METRICS, filters })
        : Promise.resolve(null),
      fetchYoutubeAnalyticsReport(accessToken, { startDate: seriesStart, endDate: range.end, metrics: DAY_METRICS, dimensions: 'day', sort: 'day', filters })
    ])

    const totals = parseTotals(totalsCurrentRes)
    const previousTotals = totalsPreviousRes ? parseTotals(totalsPreviousRes) : null
    const allDays = parseDaySeries(seriesRes)
    const series = allDays.filter((d) => d.date >= range.start)

    await recordSyncSuccess(client, account.id, {
      access_token_encrypted: encryptToken(accessToken, config.socialTokenEncryptionKey),
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    })

    return {
      video,
      days,
      range: { start: range.start, end: range.end },
      previousRange: comparable ? { start: range.previousStart, end: range.previousEnd } : null,
      // El vídeo no existía durante todo el periodo: las cifras son solo desde su publicación.
      partialPeriod: !availability.available,
      totals,
      previousTotals,
      comparison: previousTotals ? compareTotals(totals, previousTotals, true) : null,
      series,
      previousSeries: comparable ? allDays.filter((d) => d.date < range.start) : null,
      coverage: { expectedDays: days, returnedDays: series.length }
    }
  } catch (err) {
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/youtube-video-detail] fallo al leer el detalle:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('youtube', classified)
  }
})

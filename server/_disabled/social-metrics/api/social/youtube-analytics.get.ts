import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  refresh_token_encrypted: string | null
  status: 'connected' | 'expired' | 'revoked' | 'missing_permissions'
}

const TOTAL_METRICS = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost'
const DAY_METRICS = 'views,estimatedMinutesWatched,subscribersGained,subscribersLost'

/**
 * GET /api/social/youtube-analytics?days=7|28|90|365 — informe por periodos
 * del canal del usuario (A-R16b): totales del periodo, totales del periodo
 * anterior equivalente, comparación y serie día a día. Todo EN VIVO desde la
 * YouTube Analytics API (que ya conserva el histórico por fecha): no se
 * guarda nada nuevo en la base de datos.
 *
 * Reglas (ver server/utils/youtube-period.ts):
 *  - Un dato que Google no da es `null`, nunca 0; los días sin fila de la
 *    serie no se rellenan.
 *  - Un periodo solo se ofrece si el canal ya existía durante todo él.
 *  - Sin porcentaje de variación si el periodo anterior es incompleto o vale 0.
 *
 * Solo devuelve datos del propio usuario autenticado. Los tokens no salen del
 * servidor. Si la cuenta ya consta como caducada/revocada/sin permiso no se
 * llama a Google: se responde `reconnect_required` directamente.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'social-read', user.sub)

  const days = Number(getQuery(event).days ?? 28)
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
    throw toSocialHttpError('youtube', { kind: account.status === 'missing_permissions' ? 'missing_permissions' : account.status, code: `stored_${account.status}`, httpStatus: null, reconnect: true })
  }

  try {
    const refreshToken = decryptToken(account.refresh_token_encrypted, config.socialTokenEncryptionKey)
    const refreshed = await refreshYoutubeAccessToken(refreshToken, config.youtubeClientId, config.youtubeClientSecret)
    const accessToken = refreshed.access_token

    const channelRes = await fetchYoutubeChannel(accessToken)
    const publishedAt = channelRes.items?.[0]?.snippet?.publishedAt ?? null

    const now = new Date()
    const periods = availablePeriods(publishedAt, now)
    const chosen = periods.find((p) => p.days === days)!
    if (!chosen.available) {
      throw createError({
        statusCode: 422,
        statusMessage: 'El canal no existía durante todo ese periodo: elige uno más corto.',
        data: { code: 'period_unavailable', availablePeriods: periods }
      })
    }

    const range = periodRanges(now, days)
    // Con comparación se pide una sola serie que abarca los dos periodos y se parte aquí.
    const comparable = chosen.comparable
    const seriesStart = comparable ? range.previousStart : range.start

    const [totalsCurrentRes, totalsPreviousRes, seriesRes] = await Promise.all([
      fetchYoutubeAnalyticsReport(accessToken, { startDate: range.start, endDate: range.end, metrics: TOTAL_METRICS }),
      comparable
        ? fetchYoutubeAnalyticsReport(accessToken, { startDate: range.previousStart, endDate: range.previousEnd, metrics: TOTAL_METRICS })
        : Promise.resolve(null),
      fetchYoutubeAnalyticsReport(accessToken, { startDate: seriesStart, endDate: range.end, metrics: DAY_METRICS, dimensions: 'day', sort: 'day' })
    ])

    const totals = parseTotals(totalsCurrentRes)
    const previousTotals = totalsPreviousRes ? parseTotals(totalsPreviousRes) : null
    const allDays = parseDaySeries(seriesRes)
    const series = allDays.filter((d) => d.date >= range.start)
    const previousSeries = comparable ? allDays.filter((d) => d.date < range.start) : null

    // Guarda el token renovado y marca la cuenta como sincronizada.
    await recordSyncSuccess(client, account.id, {
      access_token_encrypted: encryptToken(accessToken, config.socialTokenEncryptionKey),
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    })

    return {
      days,
      range: { start: range.start, end: range.end },
      previousRange: comparable ? { start: range.previousStart, end: range.previousEnd } : null,
      availablePeriods: periods,
      totals,
      previousTotals,
      // Solo con periodo anterior completo; sin él no hay comparación, ni siquiera absoluta.
      comparison: previousTotals ? compareTotals(totals, previousTotals, true) : null,
      series,
      previousSeries,
      coverage: { expectedDays: days, returnedDays: series.length }
    }
  } catch (err) {
    // Errores ya controlados (422 de periodo no disponible): se devuelven tal cual.
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/youtube-analytics] fallo al leer el informe:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('youtube', classified)
  }
})

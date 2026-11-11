import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  refresh_token_encrypted: string | null
  status: 'connected' | 'expired' | 'revoked' | 'missing_permissions'
}

/**
 * GET /api/social/youtube-video-performance?days=7|28|90|365 — qué hizo cada
 * vídeo del canal DENTRO del periodo (A-R16d.2), en vivo desde la YouTube
 * Analytics API (`dimensions=video`). No guarda nada en la base de datos.
 *
 * Mismo periodo que `youtube-analytics` (mismos rangos), para que las cifras
 * por vídeo cuadren con los totales del periodo. Reglas en
 * server/utils/youtube-video-performance.ts: métrica ausente = `null`; vídeo
 * sin fila = sin actividad registrada (no se inventan ceros); `truncated` si el
 * informe llegó al tope de 200 vídeos.
 *
 * Solo datos del propio usuario autenticado; los tokens no salen del servidor.
 * Con la cuenta ya caducada/revocada no se llama a Google.
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
    throw toSocialHttpError('youtube', { kind: account.status, code: `stored_${account.status}`, httpStatus: null, reconnect: true })
  }

  try {
    const refreshToken = decryptToken(account.refresh_token_encrypted, config.socialTokenEncryptionKey)
    const refreshed = await refreshYoutubeAccessToken(refreshToken, config.youtubeClientId, config.youtubeClientSecret)

    const range = periodRanges(new Date(), days)
    const report = await fetchYoutubeAnalyticsReport(refreshed.access_token, {
      startDate: range.start,
      endDate: range.end,
      metrics: VIDEO_PERFORMANCE_METRICS,
      dimensions: 'video',
      sort: '-views',
      maxResults: VIDEO_REPORT_LIMIT
    })
    const { videos, truncated } = parseVideoPerformance(report)

    await recordSyncSuccess(client, account.id, {
      access_token_encrypted: encryptToken(refreshed.access_token, config.socialTokenEncryptionKey),
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    })

    return { days, range: { start: range.start, end: range.end }, videos, truncated }
  } catch (err) {
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/youtube-video-performance] fallo al leer el informe:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('youtube', classified)
  }
})

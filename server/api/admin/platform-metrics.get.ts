import { serverSupabaseServiceRole } from '#supabase/server'
import { computeMetrics, loadMetricsData, sinceForRange } from '../../utils/collab-metrics'

/**
 * GET /api/admin/platform-metrics?range=… — visión general de la plataforma y fiabilidad por cuenta.
 * Solo el panel de admin (contraseña de admin + clave de servicio). Mismos cálculos que ve cada usuario.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)
  const range = String(getQuery(event).range ?? '12m')
  const since = sinceForRange(range)

  const data = await loadMetricsData(client, { categoriesOf: 'creator', limit: 5000, since })
  const { data: ratings } = await client.from('collaboration_ratings').select('ratee_profile_id, stars').limit(10000)
  data.ratings = ((ratings ?? []) as { ratee_profile_id: string; stars: number }[]).map((r) => ({ rateeProfileId: r.ratee_profile_id, stars: r.stars }))

  // Fiabilidad por cuenta: el mismo cálculo, visto desde cada creador y cada marca con actividad.
  const accounts = Object.entries(data.names).map(([profileId, who]) => {
    const mine = data.collabs.filter((c) => (who.role === 'creator' ? c.creatorProfileId : c.partnerProfileId) === profileId)
    const ids = new Set(mine.map((c) => c.id))
    const m = computeMetrics({
      collabs: mine, events: data.events.filter((e) => ids.has(e.collaborationId)), posts: data.posts.filter((p) => ids.has(p.collaborationId)), ratings: data.ratings
    }, { since, perspective: { role: who.role, profileId } })
    return {
      profileId, name: who.name, role: who.role,
      started: m.totals.started, completed: m.totals.completed, cancelled: m.totals.cancelled,
      terminatedByMe: m.terminatedByMe, terminatedAgainstMe: m.terminatedAgainstMe,
      successRate: m.successRate, onTimeRate: m.onTime.rate, responseHours: m.responseHours.mine, rating: m.rating
    }
  }).filter((a) => a.started > 0).sort((a, b) => b.started - a.started).slice(0, 200)

  return { range, generatedAt: new Date().toISOString(), metrics: computeMetrics(data, { since }), accounts }
})

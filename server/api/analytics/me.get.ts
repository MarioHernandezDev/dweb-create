import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { computeMetrics, loadMetricsData, sinceForRange, type MetricRole } from '../../utils/collab-metrics'

/**
 * GET /api/analytics/me?range=3m|6m|12m|all — métricas propias de CIBERAN del usuario.
 *
 * Todo se lee con el cliente de SU sesión, así que RLS decide qué ve: solo sus
 * colaboraciones, la cronología y las publicaciones de esas colaboraciones. Aquí no se
 * usa la clave de servicio ni se acepta ningún id en la petición: no hay forma de pedir
 * las métricas de otra cuenta.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'analytics', user.sub)

  const client = await serverSupabaseClient(event)
  const [{ data: creator }, { data: partner }] = await Promise.all([
    client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>(),
    client.from('partners').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  ])
  const role: MetricRole | null = creator ? 'creator' : partner ? 'partner' : null
  const fichaId = creator?.id ?? partner?.id
  if (!role || !fichaId) throw createError({ statusCode: 404, statusMessage: 'Sin ficha', message: 'Tu cuenta todavía no tiene ficha de creador o de marca.' })

  const range = String(getQuery(event).range ?? '12m')
  const data = await loadMetricsData(client, {
    scope: { column: role === 'creator' ? 'creator_id' : 'partner_id', id: fichaId },
    // Reparto por el tipo de la OTRA parte: con qué categorías de marca (o de creador) trabajo.
    categoriesOf: role === 'creator' ? 'partner' : 'creator'
  })
  const { data: ratings } = await client.from('collaboration_ratings').select('ratee_profile_id, stars').eq('ratee_profile_id', user.sub).limit(2000)
  data.ratings = ((ratings ?? []) as { ratee_profile_id: string; stars: number }[]).map((r) => ({ rateeProfileId: r.ratee_profile_id, stars: r.stars }))

  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return {
    role,
    range,
    generatedAt: new Date().toISOString(),
    metrics: computeMetrics(data, { since: sinceForRange(range), perspective: { role, profileId: user.sub } })
  }
})

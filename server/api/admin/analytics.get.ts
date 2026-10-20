import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Cuenta eventos en N "cubos" de `bucketDays` días hacia atrás desde hoy —
 * ventanas móviles, no meses de calendario: más simple de calcular bien
 * (sin líos de "28 vs 31 días") y perfectamente válido para una vista de
 * "últimas N semanas/meses".
 */
function bucketize(dates: Date[], bucketDays: number, bucketCount: number, weights?: number[]): number[] {
  const buckets = Array.from({ length: bucketCount }, () => 0)
  const now = Date.now()
  dates.forEach((date, i) => {
    const ageDays = (now - date.getTime()) / 86_400_000
    const idx = bucketCount - 1 - Math.floor(ageDays / bucketDays)
    if (idx >= 0 && idx < bucketCount) buckets[idx] += weights ? weights[i]! : 1
  })
  return buckets
}

function bucketLabels(bucketDays: number, bucketCount: number): string[] {
  const now = Date.now()
  return Array.from({ length: bucketCount }, (_, i) => {
    const end = new Date(now - (bucketCount - 1 - i) * bucketDays * 86_400_000)
    return end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  })
}

/**
 * Analíticas del panel de admin — registros, colaboraciones nuevas,
 * ingresos cobrados e inicios de Pro (pagado vs. regalado), en cubos
 * semanales o mensuales. Todo calculado al vuelo a partir de las tablas
 * existentes (sin tabla de métricas aparte); a esta escala (equipo de 2
 * personas revisando esto a mano) agregarlo en memoria es de sobra.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const unit = query.unit === 'month' ? 'month' : 'week'
  const bucketDays = unit === 'month' ? 30 : 7
  const bucketCount = unit === 'month' ? 6 : 8
  const windowStart = new Date(Date.now() - bucketDays * bucketCount * 86_400_000).toISOString()

  const client = serverSupabaseServiceRole(event)

  const [profilesRes, collabsCreatedRes, collabsPaidRes, subsRes] = await Promise.all([
    client.from('profiles').select('created_at').gte('created_at', windowStart),
    client.from('collaborations').select('created_at').gte('created_at', windowStart),
    client.from('collaborations').select('paid_at, budget_cents').not('paid_at', 'is', null).gte('paid_at', windowStart),
    client.from('subscriptions').select('created_at, stripe_subscription_id').gte('created_at', windowStart)
  ])

  if (profilesRes.error) throw createError({ statusCode: 500, statusMessage: profilesRes.error.message })
  if (collabsCreatedRes.error) throw createError({ statusCode: 500, statusMessage: collabsCreatedRes.error.message })
  if (collabsPaidRes.error) throw createError({ statusCode: 500, statusMessage: collabsPaidRes.error.message })
  if (subsRes.error) throw createError({ statusCode: 500, statusMessage: subsRes.error.message })

  const subs = subsRes.data as { created_at: string; stripe_subscription_id: string | null }[]
  const collabsPaid = collabsPaidRes.data as { paid_at: string; budget_cents: number | null }[]

  return {
    labels: bucketLabels(bucketDays, bucketCount),
    signups: bucketize(
      (profilesRes.data as { created_at: string }[]).map((p) => new Date(p.created_at)),
      bucketDays, bucketCount
    ),
    collaborationsCreated: bucketize(
      (collabsCreatedRes.data as { created_at: string }[]).map((c) => new Date(c.created_at)),
      bucketDays, bucketCount
    ),
    revenueCents: bucketize(
      collabsPaid.map((c) => new Date(c.paid_at)),
      bucketDays, bucketCount,
      collabsPaid.map((c) => c.budget_cents ?? 0)
    ),
    proPaid: bucketize(
      subs.filter((s) => s.stripe_subscription_id).map((s) => new Date(s.created_at)),
      bucketDays, bucketCount
    ),
    proGifted: bucketize(
      subs.filter((s) => !s.stripe_subscription_id).map((s) => new Date(s.created_at)),
      bucketDays, bucketCount
    )
  }
})

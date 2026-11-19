import { serverSupabaseServiceRole } from '#supabase/server'

function bucketLabels(bucketDays: number, bucketCount: number): string[] {
  const now = Date.now()
  return Array.from({ length: bucketCount }, (_, i) => {
    const end = new Date(now - (bucketCount - 1 - i) * bucketDays * 86_400_000)
    return end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  })
}

interface BucketRow { bucket: number; signups: number; collaborations: number; revenue_cents: number | string; pro_paid: number; pro_gifted: number }

/**
 * Analíticas del panel de admin — registros, colaboraciones nuevas,
 * ingresos cobrados e inicios de Pro (pagado vs. regalado), en cubos
 * semanales (8) o mensuales (6). Las cuentas las hace la base
 * (función `admin_analytics`, ventanas móviles de 7 o 30 días): no se traen
 * filas al servidor, así que cuesta lo mismo con 100 usuarios que con 100.000.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const unit = getQuery(event).unit === 'month' ? 'month' : 'week'
  const bucketDays = unit === 'month' ? 30 : 7
  const bucketCount = unit === 'month' ? 6 : 8

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.rpc('admin_analytics' as never, { p_unit: unit } as never)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = [...((data ?? []) as BucketRow[])].sort((x, y) => x.bucket - y.bucket)
  const col = (pick: (r: BucketRow) => number) => Array.from({ length: bucketCount }, (_, i) => pick(rows.find((r) => r.bucket === i) ?? { bucket: i, signups: 0, collaborations: 0, revenue_cents: 0, pro_paid: 0, pro_gifted: 0 }))

  return {
    labels: bucketLabels(bucketDays, bucketCount),
    signups: col((r) => r.signups),
    collaborationsCreated: col((r) => r.collaborations),
    revenueCents: col((r) => Number(r.revenue_cents)),
    proPaid: col((r) => r.pro_paid),
    proGifted: col((r) => r.pro_gifted)
  }
})

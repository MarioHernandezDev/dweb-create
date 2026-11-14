import { serverSupabaseServiceRole } from '#supabase/server'

interface GrantProBody {
  months?: number
}

/**
 * Regalo manual de Pro (amigos, promos...) — sin Stripe de por medio.
 * `subscriptions.stripe_subscription_id` se queda a null a propósito: así
 * se distingue a simple vista (o con una consulta) un Pro de verdad
 * cobrado de uno regalado a mano desde aquí.
 *
 * No hay cron que reparta créditos mes a mes para una suscripción sin
 * Stripe real detrás (ver docs/CHANGELOG.md, hueco ya conocido) — en vez
 * de dejarlo en 0 hasta que eso exista, se entrega de una vez el total de
 * los meses regalados.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'admin')

  const profileId = getRouterParam(event, 'id')
  if (!profileId) throw createError({ statusCode: 400, statusMessage: 'Falta el id de usuario.' })

  const body = await readBody<GrantProBody>(event)
  const months = Number(body.months)
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    throw createError({ statusCode: 400, statusMessage: 'months debe ser un entero entre 1 y 24.' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: creator, error: creatorError } = await client
    .from('creators')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle<{ id: string }>()
  if (creatorError) throw createError({ statusCode: 500, statusMessage: creatorError.message })
  if (!creator) throw createError({ statusCode: 404, statusMessage: 'Pro solo se puede dar a cuentas de creador de contenido.' })

  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + months)

  const { error: subError } = await client
    .from('subscriptions')
    .upsert(
      {
        creator_id: creator.id,
        plan_id: 'pro',
        status: 'active',
        stripe_subscription_id: null,
        current_period_end: periodEnd.toISOString()
      } as never,
      { onConflict: 'creator_id' }
    )
  if (subError) throw createError({ statusCode: 500, statusMessage: subError.message })

  const proPlan = plans.pro
  if (!proPlan) throw createError({ statusCode: 500, statusMessage: 'El plan Pro no está definido en stripe-plans.ts.' })

  const { error: creditError } = await client.from('credit_ledger').insert({
    creator_id: creator.id,
    amount: proPlan.monthlyCredits * months,
    reason: 'adjustment'
  } as never)
  if (creditError) throw createError({ statusCode: 500, statusMessage: creditError.message })

  await logAdminAction(event, actor, { action: `regaló ${months} mes${months === 1 ? '' : 'es'} de Pro`, targetType: 'user', targetId: profileId, targetLabel: await accountLabel(event, profileId), detail: { months } })
  return { ok: true, planExpiresAt: periodEnd.toISOString() }
})

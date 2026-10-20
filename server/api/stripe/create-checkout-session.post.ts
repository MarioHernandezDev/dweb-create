import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/stripe/create-checkout-session — suscripción de FEEDMA (Fase 3,
 * ver docs/1-ARCHITECTURE.md §1.5 y docs/7-STRIPE-SETUP.md). El Manager o el
 * Influencer pagan aquí la cuota mensual del panel; esto NO es Connect (eso
 * es la cuenta que recibe el pago de una marca, ver connect/account-link).
 */

interface Body {
  planId?: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.email) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })

  const body = await readBody<Body>(event)
  const plan = body?.planId ? plans[body.planId] : undefined
  if (!plan) throw createError({ statusCode: 400, statusMessage: 'Plan desconocido.' })

  const client = serverSupabaseServiceRole(event)
  const payer = await resolvePayerIdentity(client, user.sub)
  if (payer.kind !== plan.for) {
    throw createError({ statusCode: 403, statusMessage: `El plan "${plan.id}" es para ${plan.for === 'manager' ? 'managers' : 'influencers'}.` })
  }

  const stripe = useStripe()
  const config = useRuntimeConfig()
  const origin = getRequestURL(event).origin

  // Reutiliza el customer de Stripe si ya existe una suscripción previa
  // (activa o no) para este manager/influencer, en vez de crear uno nuevo
  // cada vez que intenta suscribirse.
  const ownerColumn = payer.kind === 'manager' ? 'manager_id' : 'influencer_id'
  const { data: existingSubscription } = await client
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq(ownerColumn, payer.id)
    .maybeSingle<{ stripe_customer_id: string | null }>()

  const customerId = existingSubscription?.stripe_customer_id
    ?? (await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.sub, [ownerColumn]: payer.id } })).id

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: plan.unitAmount,
        recurring: { interval: 'month' },
        product_data: { name: plan.label }
      },
      quantity: 1
    }],
    success_url: `${origin}/${payer.kind === 'manager' ? 'manager' : 'creator'}/profile?checkout=success`,
    cancel_url: `${origin}/${payer.kind === 'manager' ? 'manager' : 'creator'}/profile?checkout=cancelled`,
    metadata: { plan_id: plan.id, owner_column: ownerColumn, owner_id: payer.id }
  })

  if (!session.url) throw createError({ statusCode: 500, statusMessage: 'Stripe no devolvió una URL de Checkout.' })
  return { url: session.url }
})

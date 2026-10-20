import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/stripe/create-checkout-session — suscripción de FEEDMA (Fase 3,
 * ver docs/1-ARCHITECTURE.md §1.5 y docs/7-STRIPE-SETUP.md). El creador paga
 * aquí la cuota mensual del panel; esto NO es Connect (eso es la cuenta que
 * recibe el pago de un partner, ver connect/account-link).
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

  const stripe = useStripe()
  const origin = getRequestURL(event).origin

  // Reutiliza el customer de Stripe si ya existe una suscripción previa
  // (activa o no) para este creador, en vez de crear uno nuevo cada vez que
  // intenta suscribirse.
  const { data: existingSubscription } = await client
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('creator_id', payer.id)
    .maybeSingle<{ stripe_customer_id: string | null }>()

  const customerId = existingSubscription?.stripe_customer_id
    ?? (await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.sub, creator_id: payer.id } })).id

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
    success_url: `${origin}/creator/profile?checkout=success`,
    cancel_url: `${origin}/creator/profile?checkout=cancelled`,
    metadata: { plan_id: plan.id, owner_column: 'creator_id', owner_id: payer.id }
  })

  if (!session.url) throw createError({ statusCode: 500, statusMessage: 'Stripe no devolvió una URL de Checkout.' })
  return { url: session.url }
})

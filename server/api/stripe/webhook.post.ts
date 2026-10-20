import { serverSupabaseServiceRole } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

/**
 * POST /api/stripe/webhook — único sitio que escribe en `subscriptions` y
 * actualiza `stripe_connect_onboarded`: así el estado de pago en la app
 * siempre refleja lo que Stripe dice de verdad, no lo que el cliente cree
 * que pasó (ver README Fase 3, "Webhooks de Stripe"). Firma verificada con
 * `stripe.webhooks.constructEvent` — sin eso, cualquiera podría mandar un
 * POST fingiendo que alguien pagó.
 */
export default defineEventHandler(async (event) => {
  const { stripeWebhookSecret } = useRuntimeConfig()
  if (!stripeWebhookSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Falta STRIPE_WEBHOOK_SECRET en el servidor (ver docs/7-STRIPE-SETUP.md §4).' })
  }

  const signature = getHeader(event, 'stripe-signature')
  const rawBody = await readRawBody(event)
  if (!signature || !rawBody) throw createError({ statusCode: 400, statusMessage: 'Falta el cuerpo o la firma del webhook.' })

  const stripe = useStripe()
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret)
  } catch (err) {
    throw createError({ statusCode: 400, statusMessage: `Firma inválida: ${(err as Error).message}` })
  }

  const client = serverSupabaseServiceRole(event)

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(client, stripeEvent.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(client, stripeEvent.data.object as Stripe.Subscription)
      break
    case 'invoice.paid':
      await handleInvoicePaid(client, stripeEvent.data.object as Stripe.Invoice)
      break
    case 'account.updated':
      await handleAccountUpdated(client, stripeEvent.data.object as Stripe.Account)
      break
    default:
      // Otros eventos no nos interesan todavía — Stripe espera un 200 igual.
      break
  }

  return { received: true }
})

async function handleCheckoutCompleted(client: SupabaseClient, session: Stripe.Checkout.Session) {
  if (session.mode === 'payment') {
    await handleCollaborationPaid(client, session)
    return
  }
  if (session.mode !== 'subscription' || !session.subscription) return

  const planId = session.metadata?.plan_id
  const ownerColumn = session.metadata?.owner_column
  const ownerId = session.metadata?.owner_id
  if (!planId || !ownerColumn || !ownerId) return

  const stripe = useStripe()
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  const payload = {
    [ownerColumn]: ownerId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    plan_id: planId,
    status: subscription.status,
    current_period_end: new Date(subscription.items.data[0]!.current_period_end * 1000).toISOString()
  }

  const { error } = await client.from('subscriptions').upsert(payload as never, { onConflict: ownerColumn })
  if (error) console.error('[stripe webhook] fallo al guardar la suscripción:', error.message)
}

async function handleCollaborationPaid(client: SupabaseClient, session: Stripe.Checkout.Session) {
  const collaborationId = session.metadata?.collaboration_id
  if (!collaborationId) return

  const payload = {
    stripe_payment_intent_id: session.payment_intent as string,
    paid_at: new Date().toISOString()
  }
  const { error } = await client.from('collaborations').update(payload as never).eq('id', collaborationId)
  if (error) console.error('[stripe webhook] fallo al marcar la colaboración como pagada:', error.message)
}

/**
 * Recarga de créditos en cada cobro con éxito — incluido el primero. Se usa
 * `invoice.paid`, no `checkout.session.completed`, para que la recarga
 * mensual de verdad (renovaciones) y el primer cobro compartan un único
 * camino de código en vez de que `checkout.session.completed` conceda
 * créditos por su lado y se descoordine con las renovaciones futuras.
 */
async function handleInvoicePaid(client: SupabaseClient, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string | null
  if (!subscriptionId) return // facturas sin suscripción (p. ej. de otro tipo) no nos interesan aquí

  const { data: sub } = await client
    .from('subscriptions')
    .select('plan_id, manager_id, influencer_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle<{ plan_id: string; manager_id: string | null; influencer_id: string | null }>()
  if (!sub) {
    // Puede pasar si invoice.paid llega antes de que checkout.session.completed
    // termine de guardar la suscripción — raro, pero posible. Se pierde esa
    // recarga en vez de reintentarla; aceptable para esta primera versión.
    console.error('[stripe webhook] invoice.paid de una suscripción que todavía no tenemos guardada:', subscriptionId)
    return
  }

  const plan = plans[sub.plan_id]
  if (!plan) return // 'free' no tiene fila en `plans` (no es un plan de pago, no recarga por aquí)

  if (sub.influencer_id) {
    const { error } = await client
      .from('credit_ledger')
      .insert({ influencer_id: sub.influencer_id, amount: plan.monthlyCredits, reason: 'subscription_grant' } as never)
    if (error) console.error('[stripe webhook] fallo al conceder créditos:', error.message)
    return
  }

  if (sub.manager_id) {
    // Agencia: cada influencer de la plantilla recibe sus propios créditos,
    // no se reparte un pozo común del manager.
    const { data: roster } = await client.from('influencers').select('id').eq('manager_id', sub.manager_id)
    if (!roster?.length) return
    const grants = roster.map((r) => ({ influencer_id: r.id, amount: plan.monthlyCredits, reason: 'subscription_grant' }))
    const { error } = await client.from('credit_ledger').insert(grants as never)
    if (error) console.error('[stripe webhook] fallo al conceder créditos a la plantilla:', error.message)
  }
}

async function handleSubscriptionChange(client: SupabaseClient, subscription: Stripe.Subscription) {
  const payload = {
    status: subscription.status,
    current_period_end: new Date(subscription.items.data[0]!.current_period_end * 1000).toISOString()
  }
  const { error } = await client.from('subscriptions').update(payload as never).eq('stripe_subscription_id', subscription.id)
  if (error) console.error('[stripe webhook] fallo al actualizar la suscripción:', error.message)
}

async function handleAccountUpdated(client: SupabaseClient, account: Stripe.Account) {
  const onboarded = !!(account.details_submitted && account.charges_enabled)
  const payload = { stripe_connect_onboarded: onboarded } as never

  const { data: influencer } = await client
    .from('influencers')
    .select('id')
    .eq('stripe_connect_account_id', account.id)
    .maybeSingle()
  if (influencer) {
    const { error } = await client.from('influencers').update(payload).eq('stripe_connect_account_id', account.id)
    if (error) console.error('[stripe webhook] fallo al actualizar influencer.stripe_connect_onboarded:', error.message)
    return
  }

  const { data: manager } = await client
    .from('managers')
    .select('id')
    .eq('stripe_connect_account_id', account.id)
    .maybeSingle()
  if (manager) {
    const { error } = await client.from('managers').update(payload).eq('stripe_connect_account_id', account.id)
    if (error) console.error('[stripe webhook] fallo al actualizar manager.stripe_connect_onboarded:', error.message)
  }
}

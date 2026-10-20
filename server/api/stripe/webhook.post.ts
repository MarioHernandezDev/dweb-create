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

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
 *
 * Si una escritura en la base falla se responde 500 (no 200): Stripe reintenta
 * el evento durante días. Cada handler es idempotente para que el reintento no
 * duplique nada (ver H0-02 en docs/audit/07_CRITICAL_FINDINGS_VALIDATION.md).
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
    current_period_end: currentPeriodEndIso(subscription)
  }

  const { error } = await client.from('subscriptions').upsert(payload as never, { onConflict: ownerColumn })
  if (error) failAndRetry('fallo al guardar la suscripción', error.message)
}

/** Corta con 500 para que Stripe reintente el evento (los handlers son idempotentes). */
function failAndRetry(what: string, detail: string): never {
  console.error(`[stripe webhook] ${what}:`, detail)
  throw createError({ statusCode: 500, statusMessage: `Webhook no procesado: ${what}.` })
}

async function handleCollaborationPaid(client: SupabaseClient, session: Stripe.Checkout.Session) {
  const collaborationId = session.metadata?.collaboration_id
  if (!collaborationId) return

  const payload = {
    stripe_payment_intent_id: session.payment_intent as string,
    paid_at: new Date().toISOString()
  }
  // `.eq('paid_at', null)` hace esto idempotente: si Stripe reentrega el
  // mismo evento (puede pasar, es su comportamiento documentado) o dos
  // checkouts llegaron a completarse para la misma colaboración, solo la
  // primera entrega escribe algo — las siguientes no actualizan ninguna fila.
  const { data, error } = await client
    .from('collaborations')
    .update(payload as never)
    .eq('id', collaborationId)
    .is('paid_at', null)
    .select('id, creator_id, budget_cents')
    .maybeSingle<{ id: string; creator_id: string; budget_cents: number | null }>()
  if (error) failAndRetry('fallo al marcar la colaboración como pagada', error.message)
  if (!data) {
    console.error('[stripe webhook] checkout.session.completed repetido o colaboración ya pagada — ignorado:', collaborationId, 'payment_intent:', session.payment_intent)
    return
  }

  // El creador no tenía forma de saber que le habían pagado salvo entrando a
  // mirar — ahora se lo avisa igual que cualquier otro evento de la app.
  const { data: creator } = await client.from('creators').select('profile_id').eq('id', data.creator_id).maybeSingle<{ profile_id: string }>()
  if (creator?.profile_id) {
    const amountLabel = data.budget_cents ? `${(data.budget_cents / 100).toFixed(2)} €` : 'tu colaboración'
    const { error: notifyError } = await client.rpc('notify', {
      p_profile_id: creator.profile_id,
      p_type: 'collaboration_paid',
      p_title: 'Te han pagado',
      p_body: `Has cobrado ${amountLabel}.`,
      p_link: '/creator/requests'
    } as never)
    if (notifyError) console.error('[stripe webhook] fallo al notificar el cobro al creador:', notifyError.message)
  }
}

/**
 * Recarga de créditos en cada cobro con éxito — incluido el primero. Se usa
 * `invoice.paid`, no `checkout.session.completed`, para que la recarga
 * mensual de verdad (renovaciones) y el primer cobro compartan un único
 * camino de código en vez de que `checkout.session.completed` conceda
 * créditos por su lado y se descoordine con las renovaciones futuras.
 */
async function handleInvoicePaid(client: SupabaseClient, invoice: Stripe.Invoice) {
  // Desde la API 2025-03-31 el id está en `parent.subscription_details`; antes se
  // leía `invoice.subscription`, siempre undefined, y nunca se concedían créditos.
  const subscriptionId = subscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return // facturas sin suscripción (p. ej. de otro tipo) no nos interesan aquí

  const { data: sub, error: subError } = await client
    .from('subscriptions')
    .select('plan_id, creator_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle<{ plan_id: string; creator_id: string }>()
  if (subError) failAndRetry('fallo al leer la suscripción', subError.message)
  // Puede llegar antes de que checkout.session.completed guarde la suscripción:
  // se pide a Stripe que reintente en vez de perder la recarga.
  if (!sub) failAndRetry('invoice.paid de una suscripción que todavía no está guardada', subscriptionId)

  const plan = plans[sub.plan_id]
  if (!plan) return // 'free' no tiene fila en `plans` (no es un plan de pago, no recarga por aquí)

  // `stripe_invoice_id` es único: si Stripe entrega dos veces la misma factura,
  // la segunda inserción choca y se trata como ya registrada.
  const { error } = await client
    .from('credit_ledger')
    .insert({ creator_id: sub.creator_id, amount: plan.monthlyCredits, reason: 'subscription_grant', stripe_invoice_id: invoice.id } as never)
  if (isAlreadyRecorded(error)) return
  if (error) failAndRetry('fallo al conceder créditos', error.message)
}

async function handleSubscriptionChange(client: SupabaseClient, subscription: Stripe.Subscription) {
  const payload = {
    status: subscription.status,
    current_period_end: currentPeriodEndIso(subscription)
  }
  const { error } = await client.from('subscriptions').update(payload as never).eq('stripe_subscription_id', subscription.id)
  if (error) failAndRetry('fallo al actualizar la suscripción', error.message)
}

async function handleAccountUpdated(client: SupabaseClient, account: Stripe.Account) {
  const onboarded = !!(account.details_submitted && account.charges_enabled)
  const payload = { stripe_connect_onboarded: onboarded } as never

  const { error } = await client.from('creators').update(payload).eq('stripe_connect_account_id', account.id)
  if (error) failAndRetry('fallo al actualizar creator.stripe_connect_onboarded', error.message)
}

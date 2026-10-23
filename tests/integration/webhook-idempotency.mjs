// Prueba real del webhook de Stripe: firma un evento checkout.session.completed
// de verdad (con STRIPE_WEBHOOK_SECRET real) y lo manda DOS veces al servidor
// de desarrollo en marcha, para comprobar la idempotencia que se añadió en la
// Fase 1 (server/api/stripe/webhook.post.ts) — sin cobrar nada real, sin pasar
// por el Checkout de verdad: se construye el evento a mano, que es exactamente
// lo que Stripe reenvía cuando reintenta una entrega.
//
// Requiere: el dev server corriendo en http://localhost:3000, y un
// collaborationId real sin pagar (paid_at null) pasado como argv[2].
//
// Uso: node --env-file=.env tests/integration/webhook-idempotency.mjs <collaborationId>

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const collaborationId = process.argv[2]
if (!collaborationId) {
  console.error('Uso: node webhook-idempotency.mjs <collaborationId>')
  process.exit(1)
}

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
if (!stripeSecret || !webhookSecret) {
  console.error('Faltan STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET en el entorno.')
  process.exit(1)
}

const stripe = new Stripe(stripeSecret)

const fakeSession = {
  id: 'cs_test_fake_' + Date.now(),
  object: 'checkout.session',
  mode: 'payment',
  payment_intent: 'pi_test_fake_' + Date.now(),
  metadata: { collaboration_id: collaborationId }
}

const event = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  type: 'checkout.session.completed',
  data: { object: fakeSession }
}

const payload = JSON.stringify(event)
const header = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret })

async function postWebhook(label) {
  const res = await fetch('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
    body: payload
  })
  const text = await res.text()
  console.log(`[${label}] status=${res.status} body=${text}`)
  return res.status
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const before = await supabase.from('collaborations').select('paid_at, stripe_payment_intent_id').eq('id', collaborationId).single()
  console.log('ANTES:', before.data)

  const status1 = await postWebhook('1er envío')
  const after1 = await supabase.from('collaborations').select('paid_at, stripe_payment_intent_id').eq('id', collaborationId).single()
  console.log('DESPUÉS DEL 1er envío:', after1.data)

  const status2 = await postWebhook('2º envío (reentrega simulada)')
  const after2 = await supabase.from('collaborations').select('paid_at, stripe_payment_intent_id').eq('id', collaborationId).single()
  console.log('DESPUÉS DEL 2º envío:', after2.data)

  console.log('\n--- veredicto ---')
  console.log('1er envío marcó como pagado:', status1 === 200 && !!after1.data?.paid_at)
  console.log('2º envío fue idempotente (mismo paid_at, no lo cambió):', after1.data?.paid_at === after2.data?.paid_at)

  // Firma inválida -> debe rechazarse con 400, nunca procesar el evento.
  const badRes = await fetch('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=firma_invalida' },
    body: payload
  })
  console.log('Firma inválida rechazada con status:', badRes.status, '(se esperaba 400)')
}

main().catch((err) => { console.error(err); process.exit(1) })

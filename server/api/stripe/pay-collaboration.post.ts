import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/stripe/pay-collaboration — el cobro real del marketplace (ver
 * README Fase 3): la marca paga el presupuesto acordado y el dinero llega
 * directo al influencer o manager (su cuenta de Stripe Connect), menos la
 * comisión de FEEDMA (`application_fee_amount`). Esto es un Checkout de
 * pago único (`mode: 'payment'`), distinto del de suscripción — ahí FEEDMA
 * es quien cobra; aquí FEEDMA solo se queda una comisión de un pago entre
 * otros dos.
 */

interface Body {
  collaborationId?: string
}

interface CollaborationRow {
  id: string
  brand_client_id: string
  influencer_id: string | null
  manager_id: string | null
  budget_cents: number | null
  paid_at: string | null
  status: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.email) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })

  const body = await readBody<Body>(event)
  if (!body?.collaborationId) throw createError({ statusCode: 400, statusMessage: 'Falta collaborationId.' })

  const client = serverSupabaseServiceRole(event)

  const { data: brandClient } = await client
    .from('brand_clients')
    .select('id')
    .eq('profile_id', user.sub)
    .maybeSingle<{ id: string }>()
  if (!brandClient) throw createError({ statusCode: 403, statusMessage: 'Solo una marca puede pagar una colaboración.' })

  const { data: collaboration } = await client
    .from('collaborations')
    .select('id, brand_client_id, influencer_id, manager_id, budget_cents, paid_at, status')
    .eq('id', body.collaborationId)
    .maybeSingle<CollaborationRow>()
  if (!collaboration || collaboration.brand_client_id !== brandClient.id) {
    throw createError({ statusCode: 404, statusMessage: 'Colaboración no encontrada.' })
  }
  if (collaboration.paid_at) throw createError({ statusCode: 400, statusMessage: 'Esta colaboración ya está pagada.' })
  // La otra parte tiene que haber aceptado antes de poder cobrar — si no,
  // ni siquiera sabe todavía que existe la solicitud (ver useCollabRequests.ts).
  if (!['accepted', 'in_progress', 'completed'].includes(collaboration.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Esta colaboración todavía no ha sido aceptada.' })
  }
  if (!collaboration.budget_cents || collaboration.budget_cents <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Esta colaboración no tiene presupuesto definido.' })
  }

  // Se paga a quien de verdad va a recibir el dinero: el influencer directo
  // si lo hay, y si no, su manager (mismo criterio que "a quién contacta la
  // marca" en client/discover.vue).
  let payeeTable: 'influencers' | 'managers'
  let payeeId: string
  if (collaboration.influencer_id) {
    payeeTable = 'influencers'
    payeeId = collaboration.influencer_id
  } else if (collaboration.manager_id) {
    payeeTable = 'managers'
    payeeId = collaboration.manager_id
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Esta colaboración no tiene a quién pagar todavía.' })
  }

  const { data: payee } = await client
    .from(payeeTable)
    .select('stripe_connect_account_id, stripe_connect_onboarded')
    .eq('id', payeeId)
    .maybeSingle<{ stripe_connect_account_id: string | null; stripe_connect_onboarded: boolean }>()
  if (!payee?.stripe_connect_account_id || !payee.stripe_connect_onboarded) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Quien recibe el pago todavía no ha conectado y verificado su cuenta de Stripe.'
    })
  }

  const stripe = useStripe()
  const origin = getRequestURL(event).origin
  const budgetCents = collaboration.budget_cents

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: budgetCents,
        product_data: { name: 'Colaboración FEEDMA', description: `Presupuesto acordado para la colaboración ${collaboration.id}` }
      },
      quantity: 1
    }],
    payment_intent_data: {
      application_fee_amount: platformFeeCents(budgetCents),
      transfer_data: { destination: payee.stripe_connect_account_id }
    },
    success_url: `${origin}/client/profile?payment=success`,
    cancel_url: `${origin}/client/profile?payment=cancelled`,
    metadata: { collaboration_id: collaboration.id }
  })

  if (!session.url) throw createError({ statusCode: 500, statusMessage: 'Stripe no devolvió una URL de Checkout.' })
  return { url: session.url }
})

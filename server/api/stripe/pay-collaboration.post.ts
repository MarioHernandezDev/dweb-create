import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/stripe/pay-collaboration — el cobro real del marketplace (ver
 * README Fase 3): el partner paga el presupuesto acordado y el dinero llega
 * directo al creador (su cuenta de Stripe Connect), menos la comisión de
 * CIBERAN (`application_fee_amount`). Esto es un Checkout de pago único
 * (`mode: 'payment'`), distinto del de suscripción — ahí CIBERAN es quien
 * cobra; aquí CIBERAN solo se queda una comisión de un pago entre otros dos.
 */

interface Body {
  collaborationId?: string
}

interface CollaborationRow {
  id: string
  partner_id: string
  creator_id: string
  budget_cents: number | null
  paid_at: string | null
  status: string
}

export default defineEventHandler(async (event) => {
  assertPaymentsEnabled(event)
  const user = await serverSupabaseUser(event)
  if (!user?.email) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'payments', user.sub)

  const body = await readBody<Body>(event)
  if (!body?.collaborationId) throw createError({ statusCode: 400, statusMessage: 'Falta collaborationId.' })

  const client = serverSupabaseServiceRole(event)

  const { data: partner } = await client
    .from('partners')
    .select('id')
    .eq('profile_id', user.sub)
    .maybeSingle<{ id: string }>()
  if (!partner) throw createError({ statusCode: 403, statusMessage: 'Solo un partner puede pagar una colaboración.' })

  const { data: collaboration } = await client
    .from('collaborations')
    .select('id, partner_id, creator_id, budget_cents, paid_at, status')
    .eq('id', body.collaborationId)
    .maybeSingle<CollaborationRow>()
  if (!collaboration || collaboration.partner_id !== partner.id) {
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

  const { data: payee } = await client
    .from('creators')
    .select('stripe_connect_account_id, stripe_connect_onboarded')
    .eq('id', collaboration.creator_id)
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

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: budgetCents,
          product_data: { name: 'Colaboración CIBERAN', description: `Presupuesto acordado para la colaboración ${collaboration.id}` }
        },
        quantity: 1
      }],
      payment_intent_data: {
        application_fee_amount: platformFeeCents(budgetCents),
        transfer_data: { destination: payee.stripe_connect_account_id }
      },
      // El detalle de la colaboración (condiciones/calendario/registro/pago)
      // vive en /partner/requests desde la Fase 2 de la reorganización de
      // navegación — volver aquí con el id permite reabrir exactamente la
      // misma colaboración, sin perder el contexto en el que se estaba.
      success_url: `${origin}/partner/requests?payment=success&collaboration=${collaboration.id}`,
      cancel_url: `${origin}/partner/requests?payment=cancelled&collaboration=${collaboration.id}`,
      metadata: { collaboration_id: collaboration.id }
    },
    // Idempotencia por ventana de 5 minutos: dos clics seguidos (doble clic,
    // doble pestaña) en esa ventana reutilizan la MISMA sesión de Stripe en
    // vez de crear dos sesiones de pago independientes para la misma
    // colaboración — pero un reintento genuino más tarde (p. ej. al día
    // siguiente, tras cancelar) sí genera una sesión nueva.
    { idempotencyKey: `collab-pay-${collaboration.id}-${Math.floor(Date.now() / 300_000)}` }
  )

  if (!session.url) throw createError({ statusCode: 500, statusMessage: 'Stripe no devolvió una URL de Checkout.' })
  return { url: session.url }
})

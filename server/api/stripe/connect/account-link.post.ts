import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * POST /api/stripe/connect/account-link — crea (si hace falta) la cuenta
 * conectada de Stripe del creador logueado y devuelve el enlace de
 * onboarding de Stripe para verificarla. Sin tipo explícito más que
 * "standard": por defecto, sin más propiedades de `controller`, Stripe ya
 * se comporta como una cuenta Standard (ver docs/7-STRIPE-SETUP.md) — el
 * dashboard completo de Stripe y la verificación las lleva Stripe, no
 * CIBERAN.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.email) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'payments', user.sub)

  const client = serverSupabaseServiceRole(event)
  const payer = await resolvePayerIdentity(client, user.sub)

  const stripe = useStripe()
  let accountId = payer.stripeConnectAccountId

  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'standard', email: user.email })
    accountId = account.id
    const { error } = await client.from('creators').update({ stripe_connect_account_id: accountId } as never).eq('id', payer.id)
    if (error) throw createError({ statusCode: 500, statusMessage: `No se pudo guardar la cuenta de Stripe: ${error.message}` })
  }

  const origin = getRequestURL(event).origin
  const returnPath = '/creator/profile?connect=done'

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${origin}${returnPath}`,
    return_url: `${origin}${returnPath}`
  })

  return { url: accountLink.url }
})

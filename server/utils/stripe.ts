import Stripe from 'stripe'

let stripeClient: Stripe | null = null

/**
 * Cliente de Stripe compartido por todas las rutas de servidor. Se crea una
 * sola vez (igual que el cliente de Supabase service_role) en vez de uno
 * nuevo por request.
 */
export function useStripe(): Stripe {
  if (!stripeClient) {
    const { stripeSecretKey } = useRuntimeConfig()
    if (!stripeSecretKey) {
      throw createError({ statusCode: 500, statusMessage: 'Falta STRIPE_SECRET_KEY en el servidor.' })
    }
    stripeClient = new Stripe(stripeSecretKey)
  }
  return stripeClient
}

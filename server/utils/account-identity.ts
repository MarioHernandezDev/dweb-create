import type { SupabaseClient } from '@supabase/supabase-js'

export interface PayerIdentity {
  id: string
  stripeConnectAccountId: string | null
}

/**
 * Quién paga/recibe en Stripe para el usuario logueado: solo los creadores
 * tienen suscripción y cuenta de Connect (ver README Fase 3 — los partners
 * no pagan una cuota a CIBERAN, pagan a través de una colaboración). Lanza
 * 403 si el usuario no es un creador.
 */
export async function resolvePayerIdentity(client: SupabaseClient, userId: string): Promise<PayerIdentity> {
  const { data: creator } = await client
    .from('creators')
    .select('id, stripe_connect_account_id')
    .eq('profile_id', userId)
    .maybeSingle<{ id: string; stripe_connect_account_id: string | null }>()
  if (creator) return { id: creator.id, stripeConnectAccountId: creator.stripe_connect_account_id }

  throw createError({ statusCode: 403, statusMessage: 'Solo los creadores de contenido tienen suscripción o cuenta de pagos.' })
}

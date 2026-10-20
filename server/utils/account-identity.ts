import type { SupabaseClient } from '@supabase/supabase-js'

export interface PayerIdentity {
  kind: 'influencer' | 'manager'
  id: string
  stripeConnectAccountId: string | null
}

/**
 * Quién paga/recibe en Stripe para el usuario logueado: solo managers e
 * influencers tienen suscripción y cuenta de Connect (ver README Fase 3 —
 * las marcas no pagan a FEEDMA, pagan a través de una colaboración). Lanza
 * 403 si el usuario no es ninguno de los dos.
 */
export async function resolvePayerIdentity(client: SupabaseClient, userId: string): Promise<PayerIdentity> {
  const { data: influencer } = await client
    .from('influencers')
    .select('id, stripe_connect_account_id')
    .eq('profile_id', userId)
    .maybeSingle<{ id: string; stripe_connect_account_id: string | null }>()
  if (influencer) return { kind: 'influencer', id: influencer.id, stripeConnectAccountId: influencer.stripe_connect_account_id }

  const { data: manager } = await client
    .from('managers')
    .select('id, stripe_connect_account_id')
    .eq('profile_id', userId)
    .maybeSingle<{ id: string; stripe_connect_account_id: string | null }>()
  if (manager) return { kind: 'manager', id: manager.id, stripeConnectAccountId: manager.stripe_connect_account_id }

  throw createError({ statusCode: 403, statusMessage: 'Solo managers e influencers tienen suscripción o cuenta de pagos.' })
}

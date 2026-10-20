/**
 * Catálogo de planes de pago. Vive en código (no en el panel de Stripe)
 * para no depender de que alguien cree Products/Prices a mano en el
 * Dashboard — Stripe Checkout acepta precios "inline" (`price_data`) sin
 * necesitar un `price_...` creado de antemano. Cambiar un precio es cambiar
 * una línea aquí, no ir a configurar nada fuera del repo.
 */
export interface PlanConfig {
  id: 'starter' | 'pro' | 'agency'
  label: string
  unitAmount: number // céntimos de EUR
  /** A qué tipo de cuenta se le ofrece este plan. */
  for: 'influencer' | 'manager'
}

export const plans: Record<string, PlanConfig> = {
  pro: { id: 'pro', label: 'FEEDMA Pro', unitAmount: 1999, for: 'influencer' },
  agency: { id: 'agency', label: 'FEEDMA Agencia', unitAmount: 4999, for: 'manager' }
}

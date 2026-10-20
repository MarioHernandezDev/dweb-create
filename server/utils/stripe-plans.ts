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
  /**
   * Créditos de `/api/ml/predict` que concede cada ciclo de facturación
   * (ver `server/api/stripe/webhook.post.ts`, evento `invoice.paid`). En
   * el plan Agencia, cada influencer de la plantilla del manager recibe
   * esta cantidad por separado — no es un pozo común.
   */
  monthlyCredits: number
}

export const plans: Record<string, PlanConfig> = {
  pro: { id: 'pro', label: 'FEEDMA Pro', unitAmount: 1999, for: 'influencer', monthlyCredits: 20 },
  agency: { id: 'agency', label: 'FEEDMA Agencia', unitAmount: 4999, for: 'manager', monthlyCredits: 20 }
}

/**
 * Comisión del marketplace: cuando una marca paga a un influencer/manager a
 * través de la plataforma, FEEDMA se queda este % (ver README Fase 3,
 * "Stripe Connect"). Vive aquí, en un único sitio, igual que los planes.
 */
export const MARKETPLACE_FEE_RATE = 0.1

export function platformFeeCents(budgetCents: number): number {
  return Math.round(budgetCents * MARKETPLACE_FEE_RATE)
}

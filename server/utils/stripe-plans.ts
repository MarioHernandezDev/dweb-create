/**
 * Catálogo de planes de pago. Vive en código (no en el panel de Stripe)
 * para no depender de que alguien cree Products/Prices a mano en el
 * Dashboard — Stripe Checkout acepta precios "inline" (`price_data`) sin
 * necesitar un `price_...` creado de antemano. Cambiar un precio es cambiar
 * una línea aquí, no ir a configurar nada fuera del repo.
 */
export interface PlanConfig {
  id: 'starter' | 'pro'
  label: string
  unitAmount: number // céntimos de EUR
  /** Créditos de `/api/ml/predict` que concede cada ciclo de facturación (ver `server/api/stripe/webhook.post.ts`, evento `invoice.paid`). */
  monthlyCredits: number
}

export const plans: Record<string, PlanConfig> = {
  pro: { id: 'pro', label: 'CIBERAN Pro', unitAmount: 1999, monthlyCredits: 20 }
}

// La comisión vive en app/utils/fees.ts (la usa también la pantalla de «Proponer»).
export { MARKETPLACE_FEE_RATE, platformFeeCents } from '../../app/utils/fees'

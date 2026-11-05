/**
 * Comisión del marketplace: cuando un partner paga a un creador a través de la
 * plataforma, CIBERAN se queda este %. Vive aquí, en un único sitio, porque la
 * usan el servidor (Stripe, `server/utils/stripe-plans.ts`) y la pantalla que
 * enseña al creador lo que cobrará (resumen de «Proponer»).
 */
export const MARKETPLACE_FEE_RATE = 0.1

export function platformFeeCents(budgetCents: number): number {
  return Math.round(budgetCents * MARKETPLACE_FEE_RATE)
}

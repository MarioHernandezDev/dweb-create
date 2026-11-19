import type Stripe from 'stripe'

/**
 * Lectura de los objetos que llegan al webhook de Stripe (H0-02). Lógica pura,
 * sin Nitro ni red, para probarla con tests unitarios.
 *
 * Por qué existe: desde la API 2025-03-31 la factura ya no trae `subscription`
 * en la raíz; el id está en `parent.subscription_details.subscription`. La cuenta
 * de CIBERAN genera sus eventos con la API 2026-09-30.endive (comprobado en modo
 * test el 2026-11-03), así que `invoice.subscription` era siempre `undefined` y
 * `invoice.paid` no concedía nunca los créditos de Pro. Se acepta también la forma
 * antigua por si un endpoint de webhook se creara con una versión anterior.
 */
export function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const fromParent = invoice.parent?.subscription_details?.subscription
  if (typeof fromParent === 'string') return fromParent
  if (fromParent && typeof fromParent === 'object' && 'id' in fromParent) return fromParent.id

  // Forma anterior a 2025-03-31 (no está en los tipos actuales).
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription
  if (typeof legacy === 'string') return legacy
  if (legacy && typeof legacy === 'object' && typeof legacy.id === 'string') return legacy.id
  return null
}

/**
 * Fin del periodo en curso de una suscripción, en ISO. Desde 2025-03-31 vive en
 * cada elemento (`items.data[].current_period_end`), no en la suscripción. Si no
 * se puede leer devuelve `null` en vez de lanzar (antes `new Date(NaN)` rompía el
 * webhook con un RangeError).
 */
export function currentPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end
  const legacy = (subscription as unknown as { current_period_end?: number }).current_period_end
  const seconds = typeof fromItem === 'number' ? fromItem : typeof legacy === 'number' ? legacy : null
  return seconds === null ? null : new Date(seconds * 1000).toISOString()
}

/**
 * Error de Postgres/PostgREST que indica que la fila ya se registró antes (unique
 * violation): un evento repetido de Stripe, no un fallo. Se responde 200.
 */
export function isAlreadyRecorded(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505'
}

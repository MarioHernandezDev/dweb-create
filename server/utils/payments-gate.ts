import type { H3Event } from 'h3'

/**
 * Cierre de los cobros en el servidor. Mientras PAYMENTS_ENABLED no sea 'true'
 * (lanzamiento gratis), ninguna ruta puede abrir un pago, una suscripción ni una
 * cuenta de cobro en Stripe: se corta aquí, antes de tocar Stripe, aunque la
 * interfaz ya no enseñe los botones. El webhook no pasa por aquí (solo recibe).
 */
export function paymentsEnabled(event: H3Event): boolean {
  return useRuntimeConfig(event).public.paymentsEnabled === true
}

/** Predicción de éxito con IA: apagada salvo PREDICTIONS_ENABLED='true' (no gasta llamadas de IA en el lanzamiento). */
export function assertPredictionsEnabled(event: H3Event): void {
  if (useRuntimeConfig(event).public.predictionsEnabled === true) return
  throw createError({ statusCode: 403, statusMessage: 'Predicciones no activas', message: 'La predicción de éxito no está disponible durante el lanzamiento.' })
}

export function assertPaymentsEnabled(event: H3Event): void {
  if (paymentsEnabled(event)) return
  // statusMessage viaja en la línea de estado HTTP (solo ASCII); el texto completo va en `message`.
  throw createError({ statusCode: 403, statusMessage: 'Pagos no activos', message: 'Los pagos no están activos: CIBERAN es gratis durante el lanzamiento.' })
}

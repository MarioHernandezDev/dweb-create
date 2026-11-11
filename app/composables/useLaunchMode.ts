/**
 * Modo de lanzamiento. Un único sitio para saber si CIBERAN cobra o no.
 *
 * `paymentsEnabled` sale de la variable de entorno PAYMENTS_ENABLED (ver
 * nuxt.config.ts) y está APAGADO por defecto: lanzamiento gratis. Apagado,
 * la interfaz no ofrece Pro, ni «Pagar», ni comisión, ni cuenta de cobro, y el
 * servidor rechaza cualquier intento de abrir un pago aunque alguien llame a
 * la API a mano (server/utils/payments-gate.ts).
 */
export function useLaunchMode() {
  const config = useRuntimeConfig().public
  const paymentsEnabled = config.paymentsEnabled === true
  /** «Predicción de éxito» con IA: oculta durante el lanzamiento (PREDICTIONS_ENABLED). */
  const predictionsEnabled = config.predictionsEnabled === true
  return { paymentsEnabled, predictionsEnabled }
}

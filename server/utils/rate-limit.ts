import type { H3Event } from 'h3'

interface Bucket {
  attempts: number[]
}

/**
 * Límite de intentos en memoria, por clave (normalmente IP) — pensado para
 * un único proceso Nitro (el despliegue actual de FEEDMA), no para varias
 * instancias detrás de un balanceador. Si eso cambiara, esto tendría que
 * pasar a un store compartido (Redis/Upstash) en vez de un Map local.
 *
 * Ventana deslizante simple: cuenta cuántos intentos caen dentro de los
 * últimos `windowMs` y rechaza a partir de `max`. Se limpia solo (los
 * intentos viejos se descartan en cada llamada, no hay que programar nada).
 */
const buckets = new Map<string, Bucket>()

export function checkRateLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { attempts: [] }
  bucket.attempts = bucket.attempts.filter((t) => now - t < windowMs)

  if (bucket.attempts.length >= max) {
    const oldest = bucket.attempts[0]!
    buckets.set(key, bucket)
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000) }
  }

  bucket.attempts.push(now)
  buckets.set(key, bucket)
  return { allowed: true, retryAfterSeconds: 0 }
}

/** IP del cliente, con fallback por si el proxy no manda cabeceras (dev local). */
export function clientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
}

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

/**
 * Atajo para los endpoints: aplica el límite y, si se supera, corta con un 429
 * y la cabecera `Retry-After`. `key` suele ser `<ámbito>:<id de usuario>` para
 * endpoints con sesión, o `<ámbito>:<IP>` para los públicos.
 *
 * Limitación conocida (Q3): el contador vive en la memoria del proceso. Con
 * varias instancias, cada una cuenta por su lado, y un reinicio lo pone a cero.
 * Vale como freno a abusos y a costes de IA, no como garantía estricta.
 */
export function enforceRateLimit(event: H3Event, key: string, max: number, windowMs: number): void {
  const { allowed, retryAfterSeconds } = checkRateLimit(key, max, windowMs)
  if (allowed) return
  setResponseHeader(event, 'Retry-After', retryAfterSeconds)
  throw createError({
    statusCode: 429,
    statusMessage: `Demasiadas peticiones. Vuelve a probar en ${retryAfterSeconds} segundo(s).`
  })
}

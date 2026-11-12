import { createHash, timingSafeEqual } from 'node:crypto'

/** Autorización de las tareas programadas (cron) con un secreto compartido: `Authorization: Bearer <SYNC_CRON_SECRET>`. */

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/** Extrae el token de una cabecera `Authorization: Bearer <token>`. */
export function bearerToken(authorizationHeader: string | undefined): string | null {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

/**
 * Comprueba el secreto compartido en tiempo constante. FALLA CERRADO: si no hay secreto configurado
 * (o está vacío) nunca autoriza. Se comparan los hashes para no revelar la longitud del secreto.
 */
export function verifyCronSecret(authorizationHeader: string | undefined, secret: string | undefined): boolean {
  if (!secret) return false
  const provided = bearerToken(authorizationHeader)
  if (!provided) return false
  return timingSafeEqual(sha256(provided), sha256(secret))
}

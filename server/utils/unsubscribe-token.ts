import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Enlace de baja de los avisos por correo. El token es el id del perfil firmado
 * (HMAC-SHA256): no caduca (un enlace de baja debe seguir valiendo en correos
 * antiguos) y solo sirve para una cosa: apagar los avisos por correo de ese perfil.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sign(profileId: string, secret: string): string {
  return createHmac('sha256', secret).update(`ciberan:unsubscribe:v1:${profileId.toLowerCase()}`).digest('base64url')
}

export function createUnsubscribeToken(profileId: string, secret: string | undefined): string | null {
  if (!secret || secret.length < 32 || !UUID_RE.test(profileId)) return null
  return `${profileId.toLowerCase()}.${sign(profileId, secret)}`
}

/** Devuelve el id del perfil si la firma es válida; si no, null. */
export function verifyUnsubscribeToken(token: unknown, secret: string | undefined): string | null {
  if (typeof token !== 'string' || token.length > 200 || !secret || secret.length < 32) return null
  const dot = token.indexOf('.')
  if (dot < 0) return null
  const profileId = token.slice(0, dot)
  if (!UUID_RE.test(profileId)) return null
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(sign(profileId, secret))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  return profileId.toLowerCase()
}

export function unsubscribeUrl(appUrl: string | undefined, profileId: string, secret: string | undefined): string | null {
  const token = createUnsubscribeToken(profileId, secret)
  if (!token || !appUrl) return null
  try {
    const base = new URL(appUrl)
    if (base.protocol !== 'https:' && base.protocol !== 'http:') return null
    return `${base.origin}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`
  } catch {
    return null
  }
}

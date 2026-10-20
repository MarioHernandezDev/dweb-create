import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

interface OAuthStatePayload {
  creatorId: string
  nonce: string
  exp: number
}

/**
 * El parámetro `state` del flujo OAuth (CSRF + "quién lo pidió"), sin
 * depender de cookies ni de una tabla nueva: el propio `state` lleva el
 * `creatorId` firmado con HMAC-SHA256 usando el mismo secreto que cifra
 * los tokens (`SOCIAL_TOKEN_ENCRYPTION_KEY`). Caduca a los 10 minutos.
 */
export function createOAuthState(creatorId: string, secret: string): string {
  const payload: OAuthStatePayload = { creatorId, nonce: randomUUID(), exp: Date.now() + 10 * 60_000 }
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret).update(json).digest('base64url')
  return `${json}.${signature}`
}

/** Devuelve el `creatorId` si la firma es válida y no ha caducado; si no, `null`. */
export function verifyOAuthState(state: string, secret: string): string | null {
  const [json, signature] = state.split('.')
  if (!json || !signature) return null

  const expected = createHmac('sha256', secret).update(json).digest('base64url')
  const signatureBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) return null

  try {
    const payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf8')) as OAuthStatePayload
    if (typeof payload.creatorId !== 'string' || payload.exp < Date.now()) return null
    return payload.creatorId
  } catch {
    return null
  }
}

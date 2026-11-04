import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verificación del `signed_request` que Meta envía a las URL de «Desautorizar» y
 * de «Eliminación de datos» de una app (A-R4). Formato documentado por Meta:
 *
 *   signed_request = base64url(firma) + '.' + base64url(carga JSON)
 *   firma          = HMAC-SHA256(parte_de_la_carga_tal_cual_llega, app_secret)
 *
 * Sin la firma correcta no se hace NADA: cualquiera puede hacer un POST a esa URL,
 * y lo que hace (borrar la cuenta conectada de alguien) no puede depender de
 * datos que el llamante controla. Lógica pura (sin red ni base de datos) para
 * poder probarla.
 */
export interface MetaSignedPayload {
  algorithm?: string
  user_id?: string
  issued_at?: number
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/**
 * Devuelve la carga si la firma es válida; `null` en cualquier otro caso
 * (formato roto, algoritmo distinto de HMAC-SHA256, firma incorrecta, sin
 * `user_id`). Nunca lanza.
 */
export function verifyMetaSignedRequest(signedRequest: unknown, appSecret: string | undefined): { userId: string; issuedAt: number | null } | null {
  if (typeof signedRequest !== 'string' || !appSecret) return null
  const parts = signedRequest.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const [encodedSignature, encodedPayload] = parts as [string, string]

  let payload: MetaSignedPayload
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8')) as MetaSignedPayload
  } catch {
    return null
  }
  if (!payload || typeof payload !== 'object') return null
  if (String(payload.algorithm ?? '').toUpperCase() !== 'HMAC-SHA256') return null

  const expected = createHmac('sha256', appSecret).update(encodedPayload).digest()
  const received = fromBase64Url(encodedSignature)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  const userId = typeof payload.user_id === 'string' || typeof payload.user_id === 'number' ? String(payload.user_id) : ''
  if (!userId) return null
  return { userId, issuedAt: typeof payload.issued_at === 'number' ? payload.issued_at : null }
}

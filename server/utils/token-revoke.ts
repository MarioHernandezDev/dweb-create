/**
 * Revocación del acceso en el proveedor al desconectar una cuenta (A-R3).
 *
 * Google documenta `POST https://oauth2.googleapis.com/revoke` con el
 * parámetro `token` (access o refresh token): 200 si se revoca; 400 con un
 * código de error si el token ya no es válido. Revocar el token invalida los
 * permisos concedidos a nuestro proyecto.
 *
 * Instagram (API con Instagram Login): en la referencia consultada NO consta
 * ningún endpoint para revocar un token; el acceso lo retira el usuario desde
 * los ajustes de su cuenta de Instagram. Por eso no hay función para Instagram
 * y el endpoint de desconexión lo declara como "no soportado".
 *
 * Nunca se afirma que el proveedor revocó el token si no se pudo confirmar:
 * `unconfirmed` significa exactamente "no lo sabemos".
 */

export type RevokeOutcome =
  | 'revoked' // Google confirmó la revocación (200)
  | 'already_invalid' // el token ya no era válido (400 invalid_token): no hay nada que revocar
  | 'unconfirmed' // fallo de red, tiempo agotado u otra respuesta: NO se sabe si se revocó

export interface RevokeResult {
  outcome: RevokeOutcome
  /** Código corto y estable, sin tokens ni mensajes crudos del proveedor. */
  code: string
}

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const REVOKE_TIMEOUT_MS = 8_000

export async function revokeGoogleToken(token: string, fetchImpl: typeof fetch = fetch): Promise<RevokeResult> {
  try {
    const res = await fetchImpl(GOOGLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(REVOKE_TIMEOUT_MS)
    })
    if (res.status === 200) return { outcome: 'revoked', code: 'google_revoked' }

    let providerError: string | undefined
    try {
      providerError = ((await res.json()) as { error?: string }).error
    } catch {
      // cuerpo no JSON: se trata como respuesta no reconocida
    }
    if (res.status === 400 && providerError === 'invalid_token') return { outcome: 'already_invalid', code: 'google_invalid_token' }
    return { outcome: 'unconfirmed', code: `google_http_${res.status}` }
  } catch {
    return { outcome: 'unconfirmed', code: 'network' }
  }
}

/**
 * Lee el error que devuelven nuestros endpoints de redes sociales
 * (`server/utils/social-errors.ts`, `toSocialHttpError`): un `statusMessage`
 * comprensible y un `data.code` estable con el que la interfaz decide qué
 * enseñar (por ejemplo "Reconectar"). Un `$fetch` de Nuxt deja el cuerpo
 * JSON del error en `err.data`.
 */
export type SocialApiErrorCode = 'reconnect_required' | 'provider_action_required' | 'provider_temporarily_unavailable' | 'provider_error' | 'revoke_unconfirmed'

/** Resultado de `POST /api/social/disconnect` (ver server/api/social/disconnect.post.ts). */
export type DisconnectRevocation = 'revoked' | 'already_invalid' | 'unconfirmed' | 'not_supported' | 'none'

const KNOWN_CODES: SocialApiErrorCode[] = ['reconnect_required', 'provider_action_required', 'provider_temporarily_unavailable', 'provider_error', 'revoke_unconfirmed']

export function readSocialApiError(err: unknown): { code: SocialApiErrorCode | null; message: string | null } {
  const body = (err as { data?: { statusMessage?: unknown; data?: { code?: unknown } } } | null)?.data
  const code = body?.data?.code
  if (typeof code !== 'string' || !KNOWN_CODES.includes(code as SocialApiErrorCode)) return { code: null, message: null }
  return { code: code as SocialApiErrorCode, message: typeof body?.statusMessage === 'string' ? body.statusMessage : null }
}

/**
 * Mensaje que el servidor da para un error de petición (4xx: enlace no válido,
 * contenido no encontrado, duplicado…). Solo se fía de errores < 500: un 5xx
 * puede traer detalles internos, y ahí la interfaz usa su texto genérico.
 */
export function readClientErrorMessage(err: unknown): string | null {
  const e = err as { statusCode?: unknown; status?: unknown; data?: { statusCode?: unknown; statusMessage?: unknown } } | null
  const status = Number(e?.data?.statusCode ?? e?.statusCode ?? e?.status)
  const message = e?.data?.statusMessage
  return Number.isFinite(status) && status >= 400 && status < 500 && typeof message === 'string' && message.trim() ? message : null
}

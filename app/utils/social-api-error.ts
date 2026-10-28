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

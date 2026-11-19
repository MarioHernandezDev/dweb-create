/**
 * ¿Esta sesión nace de un enlace de correo de recuperación (y no de una sesión que ya estaba abierta)?
 * El token de acceso lleva `amr`: cómo se autenticó la sesión. Un inicio con contraseña trae `password`; el
 * enlace del correo trae `recovery` (o `otp`/`magiclink`, según la versión de Auth). Sin esta comprobación,
 * `/reset-password` aceptaba la sesión anterior del navegador y cambiaba la contraseña de OTRA cuenta.
 */
const ORDINARY = ['password', 'oauth', 'sso/saml', 'totp', 'token_refresh', 'anonymous']

export function isRecoverySession(accessToken: string | undefined | null, nowSeconds = Math.floor(Date.now() / 1000), maxAgeSeconds = 3600): boolean {
  if (!accessToken) return false
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return false
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { amr?: { method?: string; timestamp?: number }[] }
    return (json.amr ?? []).some((a) => !!a.method && !ORDINARY.includes(a.method) && nowSeconds - (a.timestamp ?? 0) <= maxAgeSeconds)
  } catch {
    return false
  }
}

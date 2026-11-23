/**
 * Traduce los mensajes de error de Supabase Auth (GoTrue) más habituales —
 * hallazgo #19 de la auditoría de usabilidad: antes solo `login.vue`
 * traducía uno ("Invalid login credentials"), y `onboarding.vue` dejaba
 * pasar cualquier otro tal cual en inglés (p. ej. "Email address ... is
 * invalid"). Centralizado aquí para que los dos formularios usen la misma
 * lista — y cualquier formulario nuevo que haga login/registro no tenga que
 * reinventarla. Lo que no se reconoce se devuelve tal cual: mejor un
 * mensaje en inglés de verdad que uno traducido que invente algo que no pasó.
 */
export function translateAuthError(message: string): string {
  const msg = message.trim()

  if (msg === 'Invalid login credentials') return 'Email o contraseña incorrectos.'
  if (msg === 'User already registered' || /already registered/i.test(msg)) {
    return 'Ya existe una cuenta con ese email — intenta acceder en vez de registrarte.'
  }
  if (/email address .* is invalid/i.test(msg) || /invalid email/i.test(msg)) {
    return 'Esa dirección de email no es válida.'
  }
  if (/password should be at least (\d+) characters?/i.test(msg)) {
    const match = msg.match(/at least (\d+) characters?/i)
    return `La contraseña debe tener al menos ${match?.[1] ?? '8'} caracteres.`
  }
  if (/rate limit/i.test(msg) || /you can only request this after/i.test(msg)) {
    return 'Demasiados intentos seguidos — espera un momento y vuelve a intentarlo.'
  }
  // Fallo del servidor de correo (SMTP rechazado, caído o sin configurar): el correo NO ha salido.
  if (/error sending .*email|smtp|username and password not accepted|\b535\b|unexpected_failure/i.test(msg)) {
    return 'No hemos podido enviar el correo ahora mismo. Inténtalo de nuevo en unos minutos; si sigue pasando, escríbenos y lo resolvemos.'
  }
  // Cambio de contraseña con código del correo (reautenticación): código mal escrito o caducado.
  if (/nonce|reauthentication|invalid.*(otp|token)|token.*(expired|invalid)/i.test(msg) && !/rate limit/i.test(msg)) {
    return 'El código no es correcto o ha caducado. Pide uno nuevo.'
  }
  if (/new password should be different|same.password/i.test(msg)) return 'La contraseña nueva tiene que ser distinta de la actual.'
  if (/email not confirmed/i.test(msg)) {
    return 'Todavía no has confirmado tu email — revisa tu bandeja de entrada.'
  }

  return msg
}

export type AuthLinkProblem = 'expired' | 'invalid' | null

/**
 * Lee el resultado de un enlace de correo de Supabase (confirmar cuenta, etc.). Cuando falla, Supabase redirige con
 * `#error=access_denied&error_code=otp_expired&error_description=…` (o en la query). `otp_expired` es el enlace
 * caducado o ya usado; cualquier otro error del enlace se trata como inválido. Sin error devuelve null.
 */
export function parseAuthLinkProblem(hash: string, search: string): AuthLinkProblem {
  const params = new URLSearchParams(`${search.replace(/^\?/, '')}&${hash.replace(/^#/, '')}`)
  const code = params.get('error_code') ?? ''
  const error = params.get('error') ?? ''
  if (!code && !error) return null
  return code === 'otp_expired' || /expired/i.test(params.get('error_description') ?? '') ? 'expired' : 'invalid'
}

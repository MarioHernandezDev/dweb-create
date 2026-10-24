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
  if (/email not confirmed/i.test(msg)) {
    return 'Todavía no has confirmado tu email — revisa tu bandeja de entrada.'
  }

  return msg
}

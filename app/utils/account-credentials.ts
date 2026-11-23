/** Validación de los formularios «Cambiar contraseña» y «Cambiar email» del perfil. Pura (sin Vue ni red) para poder probarla. */
import { passwordStrength } from './password-strength'

export const MIN_PASSWORD_LENGTH = 8
export const OTP_LENGTH = 6
/** Segundos antes de poder pedir otro código (Supabase limita los envíos). */
export const OTP_RESEND_SECONDS = 60

/** Solo dígitos, como mucho 6: admite pegar «123 456» o «123-456» desde el correo. */
export const normalizeOtp = (raw: string) => raw.replace(/\D/g, '').slice(0, OTP_LENGTH)
export function validateOtp(raw: string): string | null {
  return normalizeOtp(raw).length === OTP_LENGTH ? null : `Escribe el código de ${OTP_LENGTH} dígitos que te hemos enviado.`
}

/** Primer paso del cambio de contraseña: solo hace falta la actual (después se envía el código al correo). */
export function validateCurrentPassword(current: string): string | null {
  return current ? null : 'Escribe tu contraseña actual.'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const looksLikeEmail = (value: string) => EMAIL_RE.test(value.trim())

/** Motivo por el que no se puede cambiar la contraseña, o `null` si los datos valen. */
export function validatePasswordChange(input: { current: string; next: string; confirm: string; hints?: string[] }): string | null {
  if (!input.current) return 'Escribe tu contraseña actual.'
  if (input.next.length < MIN_PASSWORD_LENGTH) return `La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  if (input.next === input.current) return 'La contraseña nueva tiene que ser distinta de la actual.'
  if (passwordStrength(input.next, input.hints).score === 0) return 'Esa contraseña es demasiado fácil de adivinar: elige otra más larga o menos común.'
  if (input.next !== input.confirm) return 'Las contraseñas nuevas no coinciden.'
  return null
}

/** Motivo por el que no se puede cambiar el email, o `null` si los datos valen. */
export function validateEmailChange(input: { currentEmail: string; next: string; password: string }): string | null {
  const next = input.next.trim()
  if (!looksLikeEmail(next)) return 'Escribe un email válido.'
  if (next.toLowerCase() === input.currentEmail.trim().toLowerCase()) return 'Ese ya es tu email actual.'
  if (!input.password) return 'Escribe tu contraseña actual para confirmar el cambio.'
  return null
}

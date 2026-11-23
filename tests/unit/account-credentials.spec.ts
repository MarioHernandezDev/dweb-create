import { describe, it, expect } from 'vitest'
import { looksLikeEmail, MIN_PASSWORD_LENGTH, normalizeOtp, OTP_LENGTH, validateCurrentPassword, validateEmailChange, validateOtp, validatePasswordChange } from '../../app/utils/account-credentials'

describe('validatePasswordChange', () => {
  const ok = { current: 'actual-123', next: 'nueva-4567', confirm: 'nueva-4567' }
  it('acepta datos correctos', () => expect(validatePasswordChange(ok)).toBeNull())
  it('pide la contraseña actual', () => expect(validatePasswordChange({ ...ok, current: '' })).toMatch(/actual/))
  it('exige la longitud mínima', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    expect(validatePasswordChange({ ...ok, next: short, confirm: short })).toMatch(new RegExp(String(MIN_PASSWORD_LENGTH)))
  })
  it('no admite repetir la actual', () => expect(validatePasswordChange({ current: 'misma-1234', next: 'misma-1234', confirm: 'misma-1234' })).toMatch(/distinta/))
  it('rechaza las contraseñas demasiado fáciles de adivinar', () => {
    expect(validatePasswordChange({ ...ok, next: 'password123', confirm: 'password123' })).toMatch(/fácil de adivinar/)
    expect(validatePasswordChange({ ...ok, next: 'lucia-2026-x', confirm: 'lucia-2026-x', hints: ['lucia'] })).toBeNull() // «lucía» solo limita la nota, no bloquea
  })
  it('exige que las dos nuevas coincidan', () => expect(validatePasswordChange({ ...ok, confirm: 'otra-45678' })).toMatch(/no coinciden/))
})

describe('validateEmailChange', () => {
  const ok = { currentEmail: 'yo@ejemplo.com', next: 'nuevo@ejemplo.com', password: 'actual-123' }
  it('acepta datos correctos', () => expect(validateEmailChange(ok)).toBeNull())
  it('rechaza emails mal formados', () => {
    for (const bad of ['', 'sin-arroba', 'a@b', 'a b@c.com']) expect(validateEmailChange({ ...ok, next: bad }), bad).toMatch(/válido/)
  })
  it('rechaza el email que ya tienes (sin distinguir mayúsculas ni espacios)', () => {
    expect(validateEmailChange({ ...ok, next: '  YO@ejemplo.com ' })).toMatch(/actual/)
  })
  it('pide la contraseña', () => expect(validateEmailChange({ ...ok, password: '' })).toMatch(/contraseña/))
})

describe('looksLikeEmail', () => {
  it('reconoce lo básico', () => {
    expect(looksLikeEmail('a@b.es')).toBe(true)
    expect(looksLikeEmail(' a@b.es ')).toBe(true)
    expect(looksLikeEmail('a@b')).toBe(false)
  })
})

describe('código del correo', () => {
  it('normaliza lo que se pega: solo dígitos, máximo 6', () => {
    expect(normalizeOtp('123 456')).toBe('123456')
    expect(normalizeOtp('12-34-56-78')).toBe('123456')
    expect(normalizeOtp('abc')).toBe('')
    expect(OTP_LENGTH).toBe(6)
  })
  it('valida que sean 6 dígitos', () => {
    expect(validateOtp('123456')).toBeNull()
    expect(validateOtp('123 456')).toBeNull()
    expect(validateOtp('12345')).toMatch(/6 dígitos/)
    expect(validateOtp('')).toMatch(/6 dígitos/)
  })
  it('el primer paso solo pide la contraseña actual', () => {
    expect(validateCurrentPassword('')).toMatch(/actual/)
    expect(validateCurrentPassword('lo-que-sea')).toBeNull()
  })
})

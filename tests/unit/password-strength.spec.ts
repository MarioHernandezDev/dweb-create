import { describe, it, expect } from 'vitest'
import { passwordStrength } from '../../app/utils/password-strength'

describe('passwordStrength', () => {
  it('las contraseñas más comunes son «muy débiles», con o sin dígitos o símbolos al final', () => {
    for (const pw of ['password', 'Password1', 'password123!', '12345678', 'qwertyuiop', 'Contraseña', 'alex1234', 'ciberan2026']) {
      expect(passwordStrength(pw).score, pw).toBe(0)
    }
  })
  it('lo muy corto o repetitivo es muy débil', () => {
    expect(passwordStrength('abc12').score).toBe(0)
    expect(passwordStrength('aaaaaaaaaa').score).toBe(0)
    expect(passwordStrength('').score).toBe(0)
  })
  it('crece con el largo y la variedad', () => {
    const s = (p: string) => passwordStrength(p).score
    expect(s('tomate27x')).toBe(1)
    expect(s('tomate-2027')).toBe(2)
    expect(s('Tomate-2027-azul')).toBe(4)
    expect(s('Tomate-2027x')).toBeGreaterThanOrEqual(3)
    expect(s('una frase larga de verdad sin numeros')).toBe(4)
  })
  it('penaliza el propio nombre o email y las secuencias', () => {
    expect(passwordStrength('Lucia-Martin-2026!', ['lucia']).score).toBeLessThanOrEqual(1)
    expect(passwordStrength('Lucía-Martin-2026!', ['lucia']).hint).toMatch(/nombre|email/)
    expect(passwordStrength('abcdefghijkl').score).toBeLessThanOrEqual(1)
    expect(passwordStrength('1234567890ab').score).toBeLessThanOrEqual(1)
  })
  it('devuelve etiqueta y consejo en español', () => {
    const s = passwordStrength('Tomate-2027-azul')
    expect(s.label).toBe('Excelente')
    expect(s.hint).toMatch(/Muy bien/)
  })
})

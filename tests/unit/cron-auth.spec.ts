import { describe, expect, it } from 'vitest'
import { bearerToken, verifyCronSecret } from '../../server/utils/cron-auth'

const SECRET = 'a'.repeat(32)

describe('verifyCronSecret', () => {
  it('acepta el secreto correcto', () => {
    expect(verifyCronSecret(`Bearer ${SECRET}`, SECRET)).toBe(true)
  })
  it('rechaza secreto incorrecto, cabecera ausente o mal formada', () => {
    expect(verifyCronSecret(`Bearer ${SECRET}x`, SECRET)).toBe(false)
    expect(verifyCronSecret(undefined, SECRET)).toBe(false)
    expect(verifyCronSecret(SECRET, SECRET)).toBe(false)
    expect(verifyCronSecret('Bearer ', SECRET)).toBe(false)
  })
  it('falla cerrado si no hay secreto configurado', () => {
    expect(verifyCronSecret(`Bearer ${SECRET}`, undefined)).toBe(false)
    expect(verifyCronSecret('Bearer ', '')).toBe(false)
  })
  it('extrae el token', () => {
    expect(bearerToken('bearer  abc ')).toBe('abc')
    expect(bearerToken('Basic abc')).toBeNull()
  })
})

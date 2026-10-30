import { describe, expect, it } from 'vitest'
import { readClientErrorMessage, readSocialApiError } from '../../app/utils/social-api-error'

/** Forma que deja un `$fetch` de Nuxt: el cuerpo JSON del error de h3 en `err.data`. */
const apiError = (code: string, statusMessage = 'mensaje seguro') => ({ data: { statusCode: 401, statusMessage, data: { code } } })

describe('readSocialApiError', () => {
  it.each(['reconnect_required', 'provider_action_required', 'provider_temporarily_unavailable', 'provider_error', 'revoke_unconfirmed'])('reconoce el código %s', (code) => {
    expect(readSocialApiError(apiError(code, 'hola'))).toEqual({ code, message: 'hola' })
  })

  it('un código desconocido se ignora (no se muestra su mensaje)', () => {
    expect(readSocialApiError(apiError('otra_cosa'))).toEqual({ code: null, message: null })
  })

  it.each([null, undefined, 'texto', 42, {}, { data: null }, { data: { data: {} } }])('entrada sin código válido (%j) no lanza', (input) => {
    expect(readSocialApiError(input)).toEqual({ code: null, message: null })
  })

  it('un código válido sin mensaje devuelve message null', () => {
    expect(readSocialApiError({ data: { data: { code: 'reconnect_required' } } })).toEqual({ code: 'reconnect_required', message: null })
  })
})

describe('readClientErrorMessage', () => {
  const err = (statusCode: number, statusMessage?: string) => ({ data: { statusCode, statusMessage } })
  it('devuelve el mensaje de los errores de petición (4xx)', () => {
    expect(readClientErrorMessage(err(400, 'Ese enlace no es de YouTube.'))).toBe('Ese enlace no es de YouTube.')
    expect(readClientErrorMessage(err(404, 'No encontrado.'))).toBe('No encontrado.')
    expect(readClientErrorMessage(err(409, 'Duplicado.'))).toBe('Duplicado.')
  })
  it('no se fía de los 5xx (pueden traer detalles internos) ni de lo que no es un error del servidor', () => {
    expect(readClientErrorMessage(err(500, 'stack interno'))).toBeNull()
    expect(readClientErrorMessage(err(502, 'x'))).toBeNull()
    expect(readClientErrorMessage(new Error('red caída'))).toBeNull()
    expect(readClientErrorMessage(null)).toBeNull()
    expect(readClientErrorMessage(err(400, '   '))).toBeNull()
    expect(readClientErrorMessage(err(400))).toBeNull()
  })
})

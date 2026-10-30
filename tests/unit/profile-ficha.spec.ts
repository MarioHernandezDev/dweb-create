import { describe, expect, it } from 'vitest'
import { BIO_MAX, firstFichaError, LOOKING_FOR_MAX, validateFicha } from '../../app/utils/profile-ficha'

const ok = { bio: '', lookingFor: '', min: null, max: null }

describe('validateFicha', () => {
  it('una ficha vacía es válida (todo es opcional)', () => {
    expect(validateFicha(ok)).toEqual({})
    expect(firstFichaError({})).toBeNull()
  })

  it('el campo numérico vaciado llega como cadena vacía y cuenta como sin valor', () => {
    expect(validateFicha({ ...ok, min: '', max: '' })).toEqual({})
  })

  it('bio y lookingFor respetan su tope exacto', () => {
    expect(validateFicha({ ...ok, bio: 'x'.repeat(BIO_MAX) })).toEqual({})
    expect(validateFicha({ ...ok, bio: 'x'.repeat(BIO_MAX + 1) }).bio).toContain(String(BIO_MAX + 1))
    expect(validateFicha({ ...ok, lookingFor: 'x'.repeat(LOOKING_FOR_MAX) })).toEqual({})
    expect(validateFicha({ ...ok, lookingFor: 'x'.repeat(LOOKING_FOR_MAX + 1) }).lookingFor).toBeDefined()
  })

  it('rechaza importes negativos o que no son número', () => {
    expect(validateFicha({ ...ok, min: -1 }).min).toBeDefined()
    expect(validateFicha({ ...ok, max: Number.NaN }).max).toBeDefined()
    expect(validateFicha({ ...ok, min: 'abc' }).min).toBeDefined()
  })

  it('el mínimo no puede superar al máximo; iguales sí', () => {
    expect(validateFicha({ ...ok, min: 500, max: 100 }).max).toContain('no puede ser menor')
    expect(validateFicha({ ...ok, min: 100, max: 100 })).toEqual({})
    expect(validateFicha({ ...ok, min: 0, max: 50 })).toEqual({})
  })

  it('con solo uno de los dos importes no hay comparación', () => {
    expect(validateFicha({ ...ok, min: 500 })).toEqual({})
    expect(validateFicha({ ...ok, max: 100 })).toEqual({})
  })

  it('usa las etiquetas de cada rol en el mensaje', () => {
    expect(validateFicha({ ...ok, min: 5, max: 1 }, { min: 'La tarifa mínima', max: 'La tarifa máxima' }).max).toBe('La tarifa máxima no puede ser menor que la tarifa mínima.')
  })

  it('firstFichaError devuelve un único motivo legible', () => {
    expect(firstFichaError(validateFicha({ ...ok, bio: 'x'.repeat(BIO_MAX + 1), min: -1 }))).toContain('biografía')
  })
})

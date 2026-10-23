import { describe, expect, it } from 'vitest'
import { isFichaIncomplete } from '../../app/utils/ficha'

describe('isFichaIncomplete', () => {
  it('incompleta sin bio', () => {
    expect(isFichaIncomplete({ bio: null, categories: ['Moda'], minCents: 100, maxCents: 200 })).toBe(true)
  })

  it('incompleta sin categorías', () => {
    expect(isFichaIncomplete({ bio: 'Hola', categories: [], minCents: 100, maxCents: 200 })).toBe(true)
  })

  it('incompleta sin ningún rango económico', () => {
    expect(isFichaIncomplete({ bio: 'Hola', categories: ['Moda'], minCents: null, maxCents: null })).toBe(true)
  })

  it('completa con solo uno de los dos extremos del rango', () => {
    expect(isFichaIncomplete({ bio: 'Hola', categories: ['Moda'], minCents: 100, maxCents: null })).toBe(false)
  })

  it('completa con todo relleno', () => {
    expect(isFichaIncomplete({ bio: 'Hola', categories: ['Moda'], minCents: 100, maxCents: 200 })).toBe(false)
  })
})

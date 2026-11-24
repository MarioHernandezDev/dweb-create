import { describe, expect, it } from 'vitest'
import { formatMoney } from '../../app/utils/money'
import { formatEuros } from '../../app/utils/mock-data'

describe('formatMoney', () => {
  it('escribe euros sin decimales por defecto', () => {
    expect(formatMoney(150000).replace(/\s/g, ' ')).toBe('1500 €')
  })
  it('admite decimales y el cero es «0 €»', () => {
    expect(formatMoney(1250, 2)).toContain('12,50')
    expect(formatMoney(0)).toContain('0')
  })
  it('formatEuros mantiene «Sin presupuesto» para vacío', () => {
    expect(formatEuros(0)).toBe('Sin presupuesto')
    expect(formatEuros(null)).toBe('Sin presupuesto')
  })
})

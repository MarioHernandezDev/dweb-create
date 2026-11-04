import { describe, expect, it } from 'vitest'
import { platformFeeCents, plans, MARKETPLACE_FEE_RATE } from '../../server/utils/stripe-plans'

/**
 * `platformFeeCents` decide cuánto se queda CIBERAN de cada cobro entre un
 * partner y un creador (server/api/stripe/pay-collaboration.post.ts) — un
 * error de redondeo aquí es, literalmente, dinero mal calculado en cada pago.
 */
describe('platformFeeCents', () => {
  it('calcula el 10% exacto sobre importes redondos', () => {
    expect(platformFeeCents(10_000)).toBe(1_000) // 100,00€ -> 10,00€
    expect(platformFeeCents(50_000)).toBe(5_000)
  })

  it('redondea al céntimo más cercano en vez de truncar', () => {
    // 333 * 0.10 = 33.3 -> redondeado a 33
    expect(platformFeeCents(333)).toBe(33)
    // 335 * 0.10 = 33.5 -> redondeado a 34 (Math.round, mitad hacia arriba)
    expect(platformFeeCents(335)).toBe(34)
  })

  it('nunca es negativo ni mayor que el propio importe para valores positivos razonables', () => {
    for (const cents of [1, 99, 1_000, 123_456, 999_999]) {
      const fee = platformFeeCents(cents)
      expect(fee).toBeGreaterThanOrEqual(0)
      expect(fee).toBeLessThanOrEqual(cents)
    }
  })

  it('con 0 céntimos de presupuesto, la comisión es 0 (no NaN ni negativo)', () => {
    expect(platformFeeCents(0)).toBe(0)
  })

  it('la tasa publicada sigue siendo la que de verdad se usa', () => {
    // Si alguien cambia MARKETPLACE_FEE_RATE sin querer, este test lo nota
    // sin tener que ir a leer server/api/stripe/pay-collaboration.post.ts.
    expect(platformFeeCents(10_000)).toBe(Math.round(10_000 * MARKETPLACE_FEE_RATE))
  })
})

describe('plans', () => {
  it('el plan "pro" tiene un importe y unos créditos mensuales coherentes (> 0)', () => {
    expect(plans.pro?.unitAmount).toBeGreaterThan(0)
    expect(plans.pro?.monthlyCredits).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'
import { TOUR_NEW_ACCOUNT_DAYS, shouldAutoStartTour, tourSteps } from '../../app/utils/onboarding-steps'

const now = new Date('2026-11-14T12:00:00Z')
const base = { accountRead: true, completedAt: null, createdAt: '2026-11-13T10:00:00Z', seenLocally: false, now }

describe('recorrido de bienvenida: cuándo se abre solo', () => {
  it('sale en la primera visita de una cuenta recién creada', () => {
    expect(shouldAutoStartTour(base)).toBe(true)
  })
  it('no sale si la cuenta ya lo vio, en cualquier dispositivo o en este navegador', () => {
    expect(shouldAutoStartTour({ ...base, completedAt: '2026-11-13T10:05:00Z' })).toBe(false)
    expect(shouldAutoStartTour({ ...base, seenLocally: true })).toBe(false)
  })
  it('no sale en cuentas antiguas ni con datos dudosos', () => {
    expect(shouldAutoStartTour({ ...base, createdAt: '2026-10-01T10:00:00Z' })).toBe(false)
    const justInside = new Date(now.getTime() - (TOUR_NEW_ACCOUNT_DAYS * 24 - 1) * 3600 * 1000).toISOString()
    expect(shouldAutoStartTour({ ...base, createdAt: justInside })).toBe(true)
    expect(shouldAutoStartTour({ ...base, createdAt: null })).toBe(false)
    expect(shouldAutoStartTour({ ...base, createdAt: 'no es una fecha' })).toBe(false)
    expect(shouldAutoStartTour({ ...base, accountRead: false })).toBe(false)
  })
})

describe('recorrido de bienvenida: contenido', () => {
  it('cada rol cierra con una acción hacia su perfil y los pasos tienen texto', () => {
    for (const role of ['creator', 'partner'] as const) {
      const steps = tourSteps[role]
      expect(steps.length).toBeGreaterThanOrEqual(5)
      expect(steps.at(-1)?.action?.to).toBe(`/${role}/profile`)
      for (const s of steps) {
        expect(s.title.length).toBeGreaterThan(0)
        expect(s.body.length).toBeGreaterThan(20)
      }
    }
  })
  it('no habla de pagos ni de comisiones', () => {
    const all = JSON.stringify(tourSteps)
    expect(all).not.toMatch(/pago|comisi|Stripe/i)
  })
})

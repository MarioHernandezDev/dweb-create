import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { shouldAutoStartTour } from '../../app/utils/onboarding-steps'

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('registro: repetir contraseña', () => {
  const src = read('app/pages/onboarding.vue')
  it('tiene la casilla y comprueba que coincida antes de crear la cuenta', () => {
    expect(src).toContain('data-password-repeat')
    expect(src).toContain('Las contraseñas no coinciden')
    const guard = src.indexOf('password.value !== passwordRepeat.value')
    const signUp = src.indexOf('supabase.auth.signUp(')
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(signUp)
  })
})

describe('bienvenida al iniciar sesión', () => {
  it('se anuncia al iniciar sesión (formulario y vuelta de confirmación)', () => {
    expect(read('app/pages/login.vue')).toContain('useLoginWelcome().announce()')
    expect(read('app/pages/confirm.vue')).toContain('useLoginWelcome().announce()')
  })

  it('el aviso gratuito ofrece «No volver a mostrar» y se guarda por usuario', () => {
    const comp = read('app/components/onboarding/LoginWelcome.vue')
    expect(comp).toContain('No volver a mostrar')
    expect(comp).toContain('gratis durante el lanzamiento')
    const composable = read('app/composables/useLoginWelcome.ts')
    expect(composable).toMatch(/launch-notice:hide:v1:\$\{userId\}/)
  })

  it('se consume al empezar (recargar no la repite) y se puede saltar con Escape', () => {
    const comp = read('app/components/onboarding/LoginWelcome.vue')
    expect(comp).toMatch(/pending\.value = false/)
    expect(comp).toContain("e.key !== 'Escape'")
  })

  it('el recorrido de bienvenida espera a que termine la animación inicial, pero no al aviso de lanzamiento', () => {
    const tour = read('app/components/onboarding/OnboardingTour.vue')
    expect(tour).toContain('!welcomeBlocking')
    expect(tour).toMatch(/welcomePhase\.value === 'intro'/)
    // El aviso es una tarjeta que no bloquea: ya no hace esperar al recorrido.
    expect(tour).not.toContain('welcomeActive')
  })
})

describe('recorrido de bienvenida: solo cuentas nuevas', () => {
  const now = new Date('2026-11-14T12:00:00Z')
  const base = { accountRead: true, completedAt: null, seenLocally: false, now }
  it('sale en una cuenta recién creada', () => {
    expect(shouldAutoStartTour({ ...base, createdAt: '2026-11-14T11:59:00Z' })).toBe(true)
  })
  it('no sale si ya se vio, ni en cuentas antiguas, ni si no se pudo leer la cuenta', () => {
    expect(shouldAutoStartTour({ ...base, createdAt: '2026-11-14T11:59:00Z', completedAt: '2026-11-14T12:00:00Z' })).toBe(false)
    expect(shouldAutoStartTour({ ...base, createdAt: '2026-11-14T11:59:00Z', seenLocally: true })).toBe(false)
    expect(shouldAutoStartTour({ ...base, createdAt: '2026-01-01T00:00:00Z' })).toBe(false)
    expect(shouldAutoStartTour({ ...base, accountRead: false, createdAt: '2026-11-14T11:59:00Z' })).toBe(false)
  })
})

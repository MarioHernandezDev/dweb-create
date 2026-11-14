import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { translateAuthError } from '../../app/utils/auth-errors'

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('ver contraseña', () => {
  it('BaseInput añade el ojo a todos los campos de contraseña', () => {
    const src = read('app/components/ui/BaseInput.vue')
    expect(src).toContain("props.type === 'password'")
    expect(src).toContain('data-password-toggle')
    expect(src).toContain('Mostrar contraseña')
    expect(src).toContain('Ocultar contraseña')
  })
})

describe('reenviar correo de confirmación', () => {
  it('el error de «email no confirmado» sigue traduciéndose (el login lo detecta por el mensaje original)', () => {
    expect(translateAuthError('Email not confirmed')).toMatch(/no has confirmado/i)
  })
  it('login y registro usan el mismo composable, con límite de un reenvío por minuto', () => {
    expect(read('app/pages/login.vue')).toContain('useResendConfirmation()')
    expect(read('app/pages/login.vue')).toMatch(/\/email not confirmed\/i\.test\(signInError\.message\)/)
    expect(read('app/pages/onboarding.vue')).toContain('useResendConfirmation()')
    const comp = read('app/composables/useResendConfirmation.ts')
    expect(comp).toContain("type: 'signup'")
    expect(comp).toContain('COOLDOWN_SECONDS = 60')
  })
})

describe('perfil del partner', () => {
  it('muestra quién lleva la cuenta junto al nombre de la empresa', () => {
    expect(read('app/pages/partner/profile.vue')).toContain('`Cuenta de ${owner}`')
  })
})

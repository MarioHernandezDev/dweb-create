import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseAuthLinkProblem, translateAuthError } from '../../app/utils/auth-errors'
import { isRecoverySession } from '../../app/utils/recovery-session'

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

describe('fallos de correo y enlaces de confirmación', () => {
  it('un rechazo SMTP se traduce y nunca parece un envío correcto', () => {
    const msg = translateAuthError('535 "5.7.8 Username and Password not accepted. For more information, go to 5.7.8 https://support.google.com/mail/?p=BadCredentials"')
    expect(msg).toMatch(/no hemos podido enviar el correo/i)
    expect(translateAuthError('Error sending confirmation email')).toMatch(/no hemos podido enviar el correo/i)
  })
  it('distingue enlace caducado, inválido y correcto', () => {
    expect(parseAuthLinkProblem('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', '')).toBe('expired')
    expect(parseAuthLinkProblem('', '?error=access_denied&error_code=bad_jwt')).toBe('invalid')
    expect(parseAuthLinkProblem('#access_token=abc&type=signup', '')).toBeNull()
    expect(parseAuthLinkProblem('', '')).toBeNull()
  })
  it('el registro y el reenvío devuelven al usuario a /confirm de esta app', () => {
    expect(read('app/pages/onboarding.vue')).toContain('emailRedirectTo: `${window.location.origin}/confirm`')
    expect(read('app/composables/useResendConfirmation.ts')).toContain('emailRedirectTo')
  })
})

describe('restablecer contraseña: solo con la sesión del enlace', () => {
  const now = 1_800_000_000
  const jwt = (amr: unknown) => `h.${btoa(JSON.stringify({ amr })).replace(/=/g, '')}.s`
  it('acepta la sesión creada por el enlace de recuperación', () => {
    expect(isRecoverySession(jwt([{ method: 'recovery', timestamp: now - 30 }]), now)).toBe(true)
  })
  it('rechaza una sesión abierta con contraseña (otra cuenta) o antigua', () => {
    expect(isRecoverySession(jwt([{ method: 'password', timestamp: now - 30 }]), now)).toBe(false)
    expect(isRecoverySession(jwt([{ method: 'recovery', timestamp: now - 7200 }]), now)).toBe(false)
    expect(isRecoverySession(undefined, now)).toBe(false)
    expect(isRecoverySession('basura', now)).toBe(false)
  })
})

import { linkHost, parseDeliveryUrl } from '../../app/utils/delivery-links'
describe('enlaces de entrega de una publicación', () => {
  it('vacío es null y sin esquema se completa con https', () => {
    expect(parseDeliveryUrl('   ')).toEqual({ ok: true, value: null })
    expect(parseDeliveryUrl('drive.google.com/file/d/abc')).toEqual({ ok: true, value: 'https://drive.google.com/file/d/abc' })
    expect(parseDeliveryUrl('https://www.instagram.com/reel/xyz/')).toEqual({ ok: true, value: 'https://www.instagram.com/reel/xyz/' })
  })
  it('rechaza esquemas peligrosos, espacios y enlaces rotos o demasiado largos', () => {
    expect(parseDeliveryUrl('javascript:alert(1)').ok).toBe(false)
    expect(parseDeliveryUrl('data:text/html,hola').ok).toBe(false)
    expect(parseDeliveryUrl('ftp://servidor.com/x').ok).toBe(false)
    expect(parseDeliveryUrl('mi enlace.com').ok).toBe(false)
    expect(parseDeliveryUrl('algo').ok).toBe(false)
    expect(parseDeliveryUrl(`https://a.com/${'x'.repeat(500)}`).ok).toBe(false)
  })
  it('muestra solo el dominio', () => {
    expect(linkHost('https://www.tiktok.com/@a/video/1')).toBe('tiktok.com')
  })
})

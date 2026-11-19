import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { COLLAB_PHASES, paymentState, visiblePhases } from '../../app/utils/collab-phase'
import { displayNoticeBody, displayNoticeTitle } from '../../app/utils/notifications'

const read = (p: string) => readFileSync(path.join(process.cwd(), p), 'utf8')

describe('lanzamiento gratis (cobros apagados)', () => {
  it('los cobros están apagados salvo PAYMENTS_ENABLED=true', () => {
    expect(read('nuxt.config.ts')).toContain("paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true'")
  })

  it('todo endpoint que abre un pago en Stripe pasa primero por el cierre', () => {
    for (const f of ['server/api/stripe/pay-collaboration.post.ts', 'server/api/stripe/create-checkout-session.post.ts', 'server/api/stripe/connect/account-link.post.ts']) {
      const src = read(f)
      const gate = src.indexOf('assertPaymentsEnabled(event)')
      expect(gate, f).toBeGreaterThan(-1)
      // Antes de leer el cuerpo, la sesión o tocar Stripe.
      for (const later of ['useStripe()', 'readBody', 'serverSupabaseUser(event)']) {
        const at = src.indexOf(later)
        if (at > -1) expect(gate, `${f}: ${later}`).toBeLessThan(at)
      }
    }
  })

  it('ningún otro endpoint crea sesiones de pago sin el cierre', () => {
    const gateFiles = ['pay-collaboration.post.ts', 'create-checkout-session.post.ts', 'account-link.post.ts']
    const walk = (dir: string): string[] => require('node:fs').readdirSync(dir, { withFileTypes: true })
      .flatMap((e: { name: string; isDirectory: () => boolean }) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
    const offenders = walk(path.join(process.cwd(), 'server/api'))
      .filter((f) => /checkout\.sessions\.create|accountLinks\.create|paymentIntents\.create|subscriptions\.create/.test(readFileSync(f, 'utf8')))
      .filter((f) => !gateFiles.some((g) => f.endsWith(g)))
    expect(offenders).toEqual([])
  })

  it('sin cobros no hay estado «por pagar» ni fase «Pagada»', () => {
    const c = { status: 'accepted', paidAt: null, budgetCents: 30000 }
    expect(paymentState(c, true)).toBe('pending')
    expect(paymentState(c, false)).toBe('none')
    expect(paymentState({ ...c, paidAt: '2026-01-01' }, false)).toBe('paid')
    expect(visiblePhases(true)).toHaveLength(COLLAB_PHASES.length)
    expect(visiblePhases(false).map((p) => p.value)).not.toContain('paid')
  })

  it('los avisos no hablan de pagar', () => {
    expect(displayNoticeTitle('Colaboración lista para pagar', false)).not.toMatch(/pagar/i)
    expect(displayNoticeBody('Colaboración lista para pagar', 'puedes pagarla desde tus colaboraciones', false)).not.toMatch(/pag/i)
    expect(displayNoticeTitle('Colaboración lista para pagar', true)).toBe('Colaboración lista para pagar')
    expect(displayNoticeTitle('Oferta aceptada', false)).toBe('Oferta aceptada')
  })

  it('la interfaz condiciona Pro, «Pagar» y la comisión al interruptor', () => {
    expect(read('app/components/collab/CollabWorkspace.vue')).toContain('v-else-if="paymentsEnabled && payableStatuses.includes(view.status)"')
    expect(read('app/components/collab/ProposalDialog.vue')).toContain('<div v-if="paymentsEnabled"><dt>Comisión plataforma')
    const profile = read('app/pages/creator/profile.vue')
    expect(profile).toContain('<PanelCard v-if="!paymentsEnabled" title="Pagos" data-card="payments-off">')
    expect(profile).toContain('<PanelCard v-else title="Pagos" data-card="payments">')
  })
})

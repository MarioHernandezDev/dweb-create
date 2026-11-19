import { describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import { currentPeriodEndIso, isAlreadyRecorded, subscriptionIdFromInvoice } from '../../server/utils/stripe-webhook'

/**
 * H0-02: el webhook leía `invoice.subscription`, que no existe en la API con la
 * que la cuenta genera sus eventos (2026-09-30.endive). Las formas de los objetos
 * de abajo copian la estructura de los eventos `invoice.paid` reales de la cuenta
 * en modo test (solo la estructura: ids inventados).
 */
const invoiceEndive = (subscription: unknown) => ({
  id: 'in_test_endive',
  object: 'invoice',
  parent: { type: 'subscription_details', quote_details: null, subscription_details: { metadata: {}, subscription } }
}) as unknown as Stripe.Invoice

describe('subscriptionIdFromInvoice', () => {
  it('lee el id de parent.subscription_details (API actual)', () => {
    expect(subscriptionIdFromInvoice(invoiceEndive('sub_123'))).toBe('sub_123')
  })

  it('acepta la suscripción expandida como objeto', () => {
    expect(subscriptionIdFromInvoice(invoiceEndive({ id: 'sub_456', object: 'subscription' }))).toBe('sub_456')
  })

  it('acepta la forma anterior a 2025-03-31 (subscription en la raíz)', () => {
    const legacy = { id: 'in_old', object: 'invoice', subscription: 'sub_legacy' } as unknown as Stripe.Invoice
    expect(subscriptionIdFromInvoice(legacy)).toBe('sub_legacy')
  })

  it('devuelve null en una factura que no es de suscripción', () => {
    const oneOff = { id: 'in_one_off', object: 'invoice', parent: null } as unknown as Stripe.Invoice
    expect(subscriptionIdFromInvoice(oneOff)).toBeNull()
  })

  it('la lectura antigua (invoice.subscription) daba undefined con la API actual: era el fallo', () => {
    expect((invoiceEndive('sub_123') as unknown as { subscription?: string }).subscription).toBeUndefined()
  })
})

describe('currentPeriodEndIso', () => {
  it('lee current_period_end del primer elemento (API actual)', () => {
    const sub = { items: { data: [{ current_period_end: 1_793_000_000 }] } } as unknown as Stripe.Subscription
    expect(currentPeriodEndIso(sub)).toBe(new Date(1_793_000_000 * 1000).toISOString())
  })

  it('acepta la forma antigua en la raíz', () => {
    const sub = { current_period_end: 1_700_000_000, items: { data: [] } } as unknown as Stripe.Subscription
    expect(currentPeriodEndIso(sub)).toBe(new Date(1_700_000_000 * 1000).toISOString())
  })

  it('devuelve null en vez de lanzar si no hay fecha', () => {
    const sub = { items: { data: [] } } as unknown as Stripe.Subscription
    expect(currentPeriodEndIso(sub)).toBeNull()
  })
})

describe('isAlreadyRecorded', () => {
  it('reconoce la violación de unicidad como evento repetido', () => {
    expect(isAlreadyRecorded({ code: '23505' })).toBe(true)
  })

  it('cualquier otro error es un fallo real', () => {
    expect(isAlreadyRecorded({ code: '42703' })).toBe(false)
    expect(isAlreadyRecorded(null)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { collabPhase, collabTitle, paymentState } from '../../app/utils/collab-phase'

const c = (o: Partial<{ status: string; paidAt: string | null }> = {}) => ({ status: 'accepted', paidAt: null, ...o })

describe('fase de una colaboración', () => {
  it('las solicitudes pendientes y rechazadas no tienen fase', () => {
    expect(collabPhase(c({ status: 'requested' }), [])).toBeNull()
    expect(collabPhase(c({ status: 'declined' }), [])).toBeNull()
  })
  it('aceptada sin nada empezado → Aceptada; con una pieza en marcha → En producción', () => {
    expect(collabPhase(c(), [])).toBe('accepted')
    expect(collabPhase(c(), [{ status: 'idea' }])).toBe('accepted')
    expect(collabPhase(c({ status: 'in_progress' }), [{ status: 'idea' }, { status: 'in_production' }])).toBe('in_production')
  })
  it('una pieza esperando a la marca manda sobre las demás', () => {
    expect(collabPhase(c(), [{ status: 'in_production' }, { status: 'ready_for_review' }])).toBe('brand_review')
  })
  it('todo publicado o completada → Publicada; pagada → Pagada', () => {
    expect(collabPhase(c(), [{ status: 'published' }, { status: 'published' }])).toBe('published')
    expect(collabPhase(c({ status: 'completed' }), [])).toBe('published')
    expect(collabPhase(c({ status: 'completed', paidAt: '2026-11-01' }), [])).toBe('paid')
    expect(collabPhase(c({ paidAt: '2026-11-01' }), [{ status: 'idea' }])).toBe('paid')
  })
})

describe('pago y título', () => {
  it('estado del pago', () => {
    expect(paymentState({ ...c(), budgetCents: 35000 })).toBe('pending')
    expect(paymentState({ ...c({ paidAt: 'x' }), budgetCents: 35000 })).toBe('paid')
    expect(paymentState({ ...c(), budgetCents: null })).toBe('none')
    expect(paymentState({ ...c({ status: 'requested' }), budgetCents: 100 })).toBe('none')
  })
  it('el título sale del paquete o de la primera frase del brief', () => {
    expect(collabTitle({ packageTitle: 'Pack reels', brief: 'x' })).toBe('Pack reels')
    expect(collabTitle({ brief: 'Dos reels con el kit. Más detalles aquí.' })).toBe('Dos reels con el kit')
    expect(collabTitle({ brief: 'a'.repeat(100) }, 20)).toHaveLength(20)
  })
})

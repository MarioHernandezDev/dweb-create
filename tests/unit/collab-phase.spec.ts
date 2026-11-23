import { describe, expect, it } from 'vitest'
import { collabBriefExcerpt, collabDisplayName, collabPhase, collabTitle, paymentState, readyPostCount } from '../../app/utils/collab-phase'

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
    expect(collabTitle({ campaignName: 'Primavera', packageTitle: 'Pack reels', brief: 'x' })).toBe('Primavera')
    expect(collabDisplayName({ campaignName: ' Primavera ', packageTitle: 'Pack', brief: 'Texto largo de ejemplo.' }, 'Ana')).toBe('Primavera')
    expect(collabTitle({ brief: 'Dos reels con el kit. Más detalles aquí.' })).toBe('Dos reels con el kit')
    expect(collabTitle({ brief: 'a'.repeat(100) }, 20)).toHaveLength(20)
  })
  it('el nombre de la colaboración nunca es una frase cortada con «…»', () => {
    expect(collabDisplayName({ packageTitle: 'Pack reels', brief: 'x' }, 'Alma')).toBe('Pack reels')
    expect(collabDisplayName({ brief: 'Dos reels con el kit. Más detalles aquí.' }, 'Alma')).toBe('Dos reels con el kit')
    // Primera frase demasiado larga → «Colaboración con …» y el brief se enseña aparte.
    const long = 'Necesitamos una campaña de lanzamiento muy completa con varios reels, stories y un directo durante dos semanas.'
    expect(collabDisplayName({ brief: long }, 'Alma Beauty')).toBe('Colaboración con Alma Beauty')
    // Las propuestas con paquete empiezan por «Propuesta: …»: el nombre conserva ese detalle, no solo «Propuesta».
    expect(collabDisplayName({ brief: 'Propuesta: 1 reel/vídeo.' }, 'Alma')).toBe('Propuesta: 1 reel/vídeo')
    expect(collabDisplayName({ brief: '' }, '')).toBe('Colaboración')
  })
  it('el brief solo se repite bajo el título si no es ya el título', () => {
    expect(collabBriefExcerpt({ brief: 'Dos reels con el kit.' }, 'Dos reels con el kit')).toBeNull()
    expect(collabBriefExcerpt({ brief: 'Dos reels con el kit. Más detalles aquí.' }, 'Dos reels con el kit')).toBe('Dos reels con el kit. Más detalles aquí.')
    expect(collabBriefExcerpt({ brief: 'x'.repeat(300) }, 'T')).toHaveLength(160)
  })
})

import { collabContextLabel } from '../../app/utils/collab-phase'
describe('collabContextLabel', () => {
  it('prefiere el nombre de campaña, luego la marca, luego el valor por defecto', () => {
    expect(collabContextLabel({ campaignName: ' Primavera ', partnerName: 'mexo' })).toBe('Primavera')
    expect(collabContextLabel({ campaignName: null, partnerName: 'mexo' })).toBe('mexo')
    expect(collabContextLabel(undefined)).toBe('Colaboración')
  })
})

describe('readyPostCount', () => {
  it('cuenta las piezas aprobadas (Programado) y las publicadas, no las que siguen en trabajo', () => {
    expect(readyPostCount([{ status: 'scheduled' }, { status: 'published' }, { status: 'in_production' }, { status: 'ready_for_review' }, { status: 'idea' }])).toBe(2)
    expect(readyPostCount([])).toBe(0)
  })
})

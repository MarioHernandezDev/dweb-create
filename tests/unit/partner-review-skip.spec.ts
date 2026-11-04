import { describe, expect, it } from 'vitest'
import { movingSkipsPartnerReview } from '../../app/utils/status'

/**
 * Aviso «Vas a saltarte la revisión del partner» (utils/status.ts). Antes
 * saltaba también al pasar de "Programado" a "Publicado" justo después de que
 * el partner aprobara — encontrado al grabar la demo (QA F-07).
 */
describe('movingSkipsPartnerReview', () => {
  it('avisa al saltar a Programado o Publicado sin pasar por la aprobación', () => {
    expect(movingSkipsPartnerReview('scheduled', 'accepted', 'ready_for_review')).toBe(true)
    expect(movingSkipsPartnerReview('published', 'in_progress', 'in_production')).toBe(true)
    expect(movingSkipsPartnerReview('scheduled', 'accepted', 'idea')).toBe(true)
  })

  it('no avisa de Programado a Publicado: ya la aprobó el partner (approve_post deja "scheduled")', () => {
    expect(movingSkipsPartnerReview('published', 'accepted', 'scheduled')).toBe(false)
    expect(movingSkipsPartnerReview('published', 'in_progress', 'scheduled')).toBe(false)
  })

  it('no avisa hacia fases anteriores a la revisión', () => {
    expect(movingSkipsPartnerReview('in_production', 'accepted', 'scheduled')).toBe(false)
    expect(movingSkipsPartnerReview('ready_for_review', 'accepted', 'in_production')).toBe(false)
  })

  it('no avisa sin colaboración activa', () => {
    expect(movingSkipsPartnerReview('published', null, 'in_production')).toBe(false)
    expect(movingSkipsPartnerReview('published', 'completed', 'in_production')).toBe(false)
    expect(movingSkipsPartnerReview('scheduled', 'requested', 'ready_for_review')).toBe(false)
  })
})

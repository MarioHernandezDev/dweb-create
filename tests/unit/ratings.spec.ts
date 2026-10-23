import { describe, expect, it } from 'vitest'
import { formatRatingSummary, hasEnoughRatingsToShowAverage, MIN_RATINGS_TO_SHOW } from '../../app/utils/ratings'

/**
 * `profile_rating_summary()` (ver supabase/migrations/
 * 20261025120000_collaboration_ratings.sql) siempre devuelve la media y el
 * recuento crudos, sin decidir nada — es esta lógica, en el cliente, la que
 * decide cuándo es honesto mostrar un número. Si falla aquí, un perfil
 * nuevo con 1-2 valoraciones podría mostrar una media injusta.
 */
describe('hasEnoughRatingsToShowAverage', () => {
  it('no es suficiente por debajo del mínimo', () => {
    expect(hasEnoughRatingsToShowAverage(0)).toBe(false)
    expect(hasEnoughRatingsToShowAverage(MIN_RATINGS_TO_SHOW - 1)).toBe(false)
  })

  it('es suficiente a partir del mínimo', () => {
    expect(hasEnoughRatingsToShowAverage(MIN_RATINGS_TO_SHOW)).toBe(true)
    expect(hasEnoughRatingsToShowAverage(MIN_RATINGS_TO_SHOW + 10)).toBe(true)
  })
})

describe('formatRatingSummary', () => {
  it('sin ninguna valoración, no inventa una media', () => {
    expect(formatRatingSummary({ avgStars: 0, ratingCount: 0 })).toBe('Sin valoraciones todavía')
  })

  it('con pocas valoraciones, avisa en vez de mostrar un número', () => {
    const text = formatRatingSummary({ avgStars: 5, ratingCount: 1 })
    expect(text).toContain('1 valoración')
    expect(text).not.toContain('5')
  })

  it('con el mínimo de valoraciones, muestra la media real', () => {
    expect(formatRatingSummary({ avgStars: 4.5, ratingCount: MIN_RATINGS_TO_SHOW })).toBe('4,5 · 3 valoraciones')
  })

  it('usa coma decimal y pluraliza bien', () => {
    expect(formatRatingSummary({ avgStars: 5, ratingCount: 1 + MIN_RATINGS_TO_SHOW })).toContain('5,0 · 4 valoraciones')
  })
})

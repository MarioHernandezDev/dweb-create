import { describe, expect, it } from 'vitest'
import { structuralScore, type PredictablePost } from '../../server/utils/ml-heuristic'

function post(overrides: Partial<PredictablePost> = {}): PredictablePost {
  return { title: '', caption: null, metadata: null, ...overrides }
}

/**
 * Esta heurística es la mitad (o el 100%, sin LLM) del score de "Predicción
 * de éxito" que ve el creador — y, tras la Fase 1 de la auditoría, el texto
 * que acompaña a ese score depende de si hubo LLM o no, nunca de un
 * "% de confianza" inventado. Que la heurística en sí se mantenga dentro de
 * rango y sea monótona (más cuidado en el borrador -> score igual o mayor)
 * es lo que hace que ese texto siga siendo honesto.
 */
describe('structuralScore', () => {
  it('nunca sale del rango documentado [5, 96]', () => {
    expect(structuralScore(post())).toBeGreaterThanOrEqual(5)
    expect(structuralScore(post())).toBeLessThanOrEqual(96)

    const maxedOut = post({
      title: 'x'.repeat(200),
      caption: 'y'.repeat(500),
      metadata: { hashtags: Array.from({ length: 50 }, (_, i) => `#tag${i}`) }
    })
    expect(structuralScore(maxedOut)).toBeLessThanOrEqual(96)
  })

  it('un borrador completamente vacío saca el score base (50), nunca 0 ni negativo', () => {
    expect(structuralScore(post())).toBe(50)
  })

  it('un título más largo (hasta el tope de 20 caracteres) sube el score', () => {
    const short = structuralScore(post({ title: 'ab' }))
    const long = structuralScore(post({ title: 'a'.repeat(20) }))
    expect(long).toBeGreaterThan(short)
  })

  it('el título deja de sumar más allá de 20 caracteres (tope explícito)', () => {
    const at20 = structuralScore(post({ title: 'a'.repeat(20) }))
    const at100 = structuralScore(post({ title: 'a'.repeat(100) }))
    expect(at100).toBe(at20)
  })

  it('un caption de más de 40 caracteres suma un bonus fijo de 10', () => {
    const withoutCaption = structuralScore(post())
    const withLongCaption = structuralScore(post({ caption: 'a'.repeat(41) }))
    expect(withLongCaption - withoutCaption).toBe(10)
  })

  it('un caption corto (<= 40) no suma el bonus', () => {
    const withoutCaption = structuralScore(post())
    const withShortCaption = structuralScore(post({ caption: 'hola' }))
    expect(withShortCaption).toBe(withoutCaption)
  })

  it('cada hashtag suma 2 puntos, hasta un tope de 5 hashtags (10 puntos)', () => {
    const base = structuralScore(post())
    const with3 = structuralScore(post({ metadata: { hashtags: ['#a', '#b', '#c'] } }))
    const with5 = structuralScore(post({ metadata: { hashtags: ['#a', '#b', '#c', '#d', '#e'] } }))
    const with20 = structuralScore(post({ metadata: { hashtags: Array.from({ length: 20 }, (_, i) => `#${i}`) } }))

    expect(with3 - base).toBe(6)
    expect(with5 - base).toBe(10)
    expect(with20).toBe(with5) // el tope de 5 hashtags no se puede superar
  })

  it('es determinista: el mismo borrador siempre da el mismo score', () => {
    const p = post({ title: 'Reel de lanzamiento', caption: 'Mira esto '.repeat(5), metadata: { hashtags: ['#moda', '#ootd'] } })
    const results = Array.from({ length: 10 }, () => structuralScore(p))
    expect(new Set(results).size).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import { buildHistoryContext, MIN_HISTORY_SAMPLE, type MeasuredViewsRow } from '../../server/utils/history-context'

const row = (post_id: string, views: number | null, measured_on: string | null = '2026-10-30'): MeasuredViewsRow => ({ post_id, views, measured_on })

describe('buildHistoryContext', () => {
  it('sin publicaciones medidas no devuelve nada', () => {
    expect(buildHistoryContext([])).toBeNull()
  })

  it('con menos de la muestra mínima no devuelve nada (no se inventa un histórico)', () => {
    expect(MIN_HISTORY_SAMPLE).toBe(3)
    expect(buildHistoryContext([row('a', 100), row('b', 200)])).toBeNull()
  })

  it('las visualizaciones null no cuentan como muestra; un 0 real sí', () => {
    expect(buildHistoryContext([row('a', 100), row('b', null), row('c', 300)])).toBeNull()
    expect(buildHistoryContext([row('a', 0), row('b', 100), row('c', 300)])).toEqual({ sampleSize: 3, medianViews: 100, minViews: 0, maxViews: 300 })
  })

  it('usa la última medición de cada publicación, sin fiarse del orden', () => {
    const r = buildHistoryContext([
      row('a', 999, '2026-10-28'), row('a', 100, '2026-10-30'), row('a', 500, '2026-10-29'),
      row('b', 200), row('c', 300)
    ])
    expect(r).toEqual({ sampleSize: 3, medianViews: 200, minViews: 100, maxViews: 300 })
  })

  it('mediana con número par de publicaciones', () => {
    const r = buildHistoryContext([row('a', 100), row('b', 200), row('c', 300), row('d', 1000)])
    expect(r?.medianViews).toBe(250)
  })

  it('ignora filas sin fecha o con valores no válidos', () => {
    expect(buildHistoryContext([row('a', 1, null), row('b', -5), row('c', Number.NaN), row('d', 10)])).toBeNull()
  })
})

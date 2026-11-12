import { describe, expect, it } from 'vitest'
import { applicableMetrics, formatDelta, metricsSummary, reasonFor, type MetricRow } from '../../../app/_disabled/social-metrics/utils/post-metrics-view'

const row = (day: string | null, over: Partial<MetricRow> = {}): MetricRow => ({
  measured_on: day, source: 'youtube', views: 1000, likes: 50, comments: 5, shares: null, saves: null, reach: null, engagement_rate: 5.5, ...over
})

describe('applicableMetrics', () => {
  it('YouTube solo tiene visualizaciones, me gusta y comentarios (no se llena de "—")', () => {
    expect(applicableMetrics('youtube')).toEqual(['views', 'likes', 'comments'])
    expect(applicableMetrics('instagram')).toHaveLength(6)
    expect(applicableMetrics('tiktok')).toEqual([])
  })
})

describe('reasonFor', () => {
  it('cada plataforma explica su ausencia', () => {
    expect(reasonFor('youtube', 'likes')).toContain('oculta los me gusta')
    expect(reasonFor('youtube', 'comments')).toContain('desactivados')
    expect(reasonFor('instagram', 'reach')).toContain('permiso de insights')
  })
})

describe('metricsSummary', () => {
  it('sin mediciones (o sin origen/fecha válidos) no hay resumen: las filas antiguas no cuentan', () => {
    expect(metricsSummary([], 'youtube')).toBeNull()
    expect(metricsSummary([row(null), row('2026-10-30', { source: null })], 'youtube')).toBeNull()
    expect(metricsSummary([row('30/10/2026')], 'youtube')).toBeNull()
  })

  it('usa la medición más reciente, sin fiarse del orden de llegada', () => {
    const s = metricsSummary([row('2026-10-28', { views: 100 }), row('2026-10-30', { views: 300 }), row('2026-10-29', { views: 200 })], 'youtube')!
    expect(s.measuredOn).toBe('2026-10-30')
    expect(s.previousOn).toBe('2026-10-29')
    expect(s.items.find((i) => i.key === 'views')).toMatchObject({ value: 300, delta: { abs: 100, text: '+100' } })
  })

  it('un dato ausente es "—" con motivo (no 0) y no tiene variación', () => {
    const s = metricsSummary([row('2026-10-29'), row('2026-10-30', { likes: null })], 'youtube')!
    const likes = s.items.find((i) => i.key === 'likes')!
    expect(likes).toMatchObject({ value: null, text: '—', delta: null })
    expect(likes.reason).toContain('oculta los me gusta')
  })

  it('un 0 real se muestra como 0 y su variación es válida', () => {
    const s = metricsSummary([row('2026-10-29', { comments: 3 }), row('2026-10-30', { comments: 0 })], 'youtube')!
    expect(s.items.find((i) => i.key === 'comments')).toMatchObject({ value: 0, text: '0', delta: { abs: -3, text: '-3' } })
  })

  it('con una sola medición, o dos del mismo día, no hay variación', () => {
    expect(metricsSummary([row('2026-10-30')], 'youtube')!.items.every((i) => i.delta === null)).toBe(true)
    const s = metricsSummary([row('2026-10-30', { views: 5 }), row('2026-10-30', { views: 9 })], 'youtube')!
    expect(s.previousOn).toBeNull()
  })

  it('la interacción es la que guardó el servidor (puede ser null)', () => {
    expect(metricsSummary([row('2026-10-30', { engagement_rate: null })], 'youtube')!.engagement).toBeNull()
    expect(metricsSummary([row('2026-10-30')], 'youtube')!.engagement).toBe(5.5)
  })

  it('Instagram enseña las seis métricas', () => {
    expect(metricsSummary([row('2026-10-30', { source: 'instagram' })], 'instagram')!.items).toHaveLength(6)
  })
})

describe('formatDelta', () => {
  it.each([[120, '+120'], [-5, '-5'], [0, '0'], [12345, '+12.345']])('%j -> %j', (n, out) => {
    expect(formatDelta(n)).toBe(out)
  })
})

import { describe, expect, it } from 'vitest'
import {
  MIN_VIDEOS_FOR_TYPICAL, channelObservations, median, topVideoOfPeriod, verdictOf, videoVsChannel, type ChannelObservationsInput
} from '../../app/utils/youtube-insights'
import type { PeriodTotalsDto } from '../../app/utils/youtube-period-view'
import type { VideoDto, VideoPerformanceDto } from '../../app/utils/youtube-videos-view'

const totals = (over: Partial<PeriodTotalsDto> = {}): PeriodTotalsDto => ({
  views: 1000, estimatedMinutesWatched: 500, averageViewDuration: 120, averageViewPercentage: 40, likes: 10, comments: 2, shares: 1,
  subscribersGained: 5, subscribersLost: 1, netSubscribers: 4, ...over
})
const perf = (id: string, views: number | null): VideoPerformanceDto => ({ id, views, estimatedMinutesWatched: null, likes: null, comments: null })
const video = (id: string, title: string, publishedAt: string | null): VideoDto => ({
  id, title, thumbnailUrl: null, publishedAt, durationSeconds: 60, viewCount: 1, likeCount: 1, commentCount: 1
})
const RANGE = { start: '2026-10-01', end: '2026-10-28' }

const base = (over: Partial<ChannelObservationsInput> = {}): ChannelObservationsInput => ({
  report: { range: RANGE, totals: totals(), comparison: null, previousTotals: null, series: [] },
  performance: null, videos: [], hasMoreVideos: false, ...over
})

describe('topVideoOfPeriod', () => {
  it('el de más visualizaciones, sin fiarse del orden', () => {
    expect(topVideoOfPeriod([perf('a', 5), perf('b', 50), perf('c', 7)])!.id).toBe('b')
  })
  it('null y 0 no cuentan como "el más visto"', () => {
    expect(topVideoOfPeriod([perf('a', null), perf('b', 0)])).toBeNull()
    expect(topVideoOfPeriod([])).toBeNull()
  })
})

describe('channelObservations', () => {
  it('sin informe no hay observaciones', () => {
    expect(channelObservations(base({ report: null }))).toEqual([])
  })

  it('sin datos no se inventa nada: ninguna observación', () => {
    expect(channelObservations(base())).toEqual([])
  })

  it('vídeo más visto y concentración, con título si está cargado y criterio siempre', () => {
    const obs = channelObservations(base({ performance: { videos: [perf('a', 250), perf('b', 10)], truncated: false }, videos: [video('a', 'Mi vídeo', '2026-01-01T00:00:00Z')], hasMoreVideos: true }))
    const top = obs.find((o) => o.id === 'top-video')!
    expect(top.text).toContain('«Mi vídeo»')
    expect(top.text).toContain('250')
    expect(obs.find((o) => o.id === 'concentration')!.text).toContain('25 %')
    expect(obs.every((o) => o.criterion.length > 20)).toBe(true)
  })

  it('el vídeo más visto sin título cargado no se esconde ni se inventa el título', () => {
    const top = channelObservations(base({ performance: { videos: [perf('zzz', 40)], truncated: true } })).find((o) => o.id === 'top-video')!
    expect(top.text).toContain('aún no está en la lista')
  })

  it('no hay concentración si el vídeo supera el total (datos incoherentes) ni con total 0 o ausente', () => {
    const r = (views: number | null) => base({ report: { ...base().report!, totals: totals({ views }) }, performance: { videos: [perf('a', 500)], truncated: false } })
    for (const v of [100, 0, null]) expect(channelObservations(r(v)).some((o) => o.id === 'concentration')).toBe(false)
  })

  it('cambio de visualizaciones: solo con porcentaje válido; estable si <1 %', () => {
    const withPct = (pct: number | null) => base({ report: { ...base().report!, totals: totals({ views: 1100 }), previousTotals: totals({ views: 1000 }), comparison: { views: { abs: 100, pct } } as never } })
    expect(channelObservations(withPct(10)).find((o) => o.id === 'views-change')!.text).toMatch(/suben un 10 %.*1.000 → 1.100/)
    expect(channelObservations(withPct(-3.5)).find((o) => o.id === 'views-change')!.text).toContain('bajan un 3,5 %')
    expect(channelObservations(withPct(0.4)).find((o) => o.id === 'views-change')!.text).toContain('estables')
    expect(channelObservations(withPct(null)).some((o) => o.id === 'views-change')).toBe(false)
  })

  it('mejor día: ignora los días sin dato y no se genera si el máximo es 0', () => {
    const day = (date: string, views: number | null) => ({ date, views, estimatedMinutesWatched: null, subscribersGained: null, subscribersLost: null })
    const mk = (series: ReturnType<typeof day>[]) => base({ report: { ...base().report!, series } })
    const best = channelObservations(mk([day('2026-10-02', 5), day('2026-10-03', null), day('2026-10-04', 90)])).find((o) => o.id === 'best-day')!
    expect(best.text).toContain('4 de octubre')
    expect(best.criterion).toContain('2 días con dato')
    expect(channelObservations(mk([day('2026-10-02', 0), day('2026-10-03', null)])).some((o) => o.id === 'best-day')).toBe(false)
  })

  it('vídeos publicados: solo si ya están cargados todos los del rango', () => {
    const inRange = video('a', 'A', '2026-10-10T10:00:00Z')
    const old = video('b', 'B', '2026-08-01T10:00:00Z')
    const after = video('c', 'C', '2026-10-29T10:00:00Z')
    const published = (o: ReturnType<typeof channelObservations>) => o.find((x) => x.id === 'published')
    // Quedan más páginas y la más antigua cargada aún está dentro del rango: no se puede afirmar nada.
    expect(published(channelObservations(base({ videos: [inRange], hasMoreVideos: true })))).toBeUndefined()
    // Ya se llegó a un vídeo anterior al rango: el recuento es exacto (y los publicados tras el rango no cuentan).
    expect(published(channelObservations(base({ videos: [after, inRange, old], hasMoreVideos: true })))!.text).toBe('Has publicado 1 vídeo en el periodo.')
    expect(published(channelObservations(base({ videos: [old], hasMoreVideos: false })))!.text).toBe('No has publicado vídeos en el periodo.')
  })
})

describe('verdictOf', () => {
  it.each([[120, 100, 'above'], [111, 100, 'above'], [110, 100, 'similar'], [95, 100, 'similar'], [90, 100, 'similar'], [89, 100, 'below']])('%j frente a %j -> %j', (v, r, out) => {
    expect(verdictOf(v, r)).toBe(out)
  })
  it('sin referencia válida no hay veredicto (no se divide por 0)', () => {
    expect(verdictOf(5, 0)).toBeNull()
    expect(verdictOf(5, -1)).toBeNull()
  })
})

describe('median', () => {
  it('impar, par y vacío', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('videoVsChannel', () => {
  const six = [10, 20, 30, 40, 50, 60].map((n, i) => perf(`v${i}`, n))
  const vt = (over: Partial<PeriodTotalsDto> = {}) => totals({ views: 100, averageViewPercentage: 60, averageViewDuration: 150, ...over })
  const input = (over = {}) => ({
    videoTotals: vt(), channelTotals: totals({ averageViewPercentage: 40, averageViewDuration: 120 }),
    performance: { videos: six, truncated: false }, partialPeriod: false, ...over
  })

  it('compara con el canal y con la mediana, y cada fila lleva su criterio', () => {
    const rows = videoVsChannel(input())
    expect(rows.map((r) => r.key)).toEqual(['avgPercentage', 'avgDuration', 'views'])
    expect(rows.find((r) => r.key === 'avgPercentage')!.verdict).toBe('above')
    expect(rows.find((r) => r.key === 'views')!.referenceLabel).toContain('mediana de 6')
    expect(rows.find((r) => r.key === 'views')!.verdict).toBe('above')
    expect(rows.every((r) => r.criterion.includes('±10 %'))).toBe(true)
  })

  it('sin dato de uno de los lados la fila no existe (no se compara con 0)', () => {
    const rows = videoVsChannel(input({ videoTotals: vt({ averageViewPercentage: null }), channelTotals: totals({ averageViewDuration: null }) }))
    expect(rows.map((r) => r.key)).toEqual(['views'])
    expect(videoVsChannel(input({ channelTotals: null, performance: null }))).toEqual([])
  })

  it('con el informe recortado o el vídeo publicado en el periodo NO se compara por visualizaciones', () => {
    expect(videoVsChannel(input({ performance: { videos: six, truncated: true } })).some((r) => r.key === 'views')).toBe(false)
    expect(videoVsChannel(input({ partialPeriod: true })).some((r) => r.key === 'views')).toBe(false)
  })

  it(`hacen falta al menos ${MIN_VIDEOS_FOR_TYPICAL} vídeos con actividad para hablar de "lo habitual"`, () => {
    expect(videoVsChannel(input({ performance: { videos: six.slice(0, MIN_VIDEOS_FOR_TYPICAL - 1), truncated: false } })).some((r) => r.key === 'views')).toBe(false)
    // Los de visualizaciones null no cuentan como vídeo con actividad.
    const withNulls = [...six.slice(0, 4), perf('x', null), perf('y', null)]
    expect(videoVsChannel(input({ performance: { videos: withNulls, truncated: false } })).some((r) => r.key === 'views')).toBe(false)
  })
})

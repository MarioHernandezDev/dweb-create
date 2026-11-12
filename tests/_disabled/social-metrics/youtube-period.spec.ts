import { describe, expect, it } from 'vitest'
import {
  availablePeriods, compareTotals, delta, isPeriodDays, parseDaySeries, parseTotals, periodRanges, PERIOD_OPTIONS, type AnalyticsReport
} from '../../../server/_disabled/social-metrics/utils/youtube-period'

const NOW = new Date('2026-10-29T10:00:00.000Z')

describe('periodRanges', () => {
  it('el periodo termina hace 2 días (latencia de Analytics) y cubre exactamente N días', () => {
    expect(periodRanges(NOW, 7)).toEqual({ start: '2026-10-21', end: '2026-10-27', previousStart: '2026-10-14', previousEnd: '2026-10-20' })
  })

  it.each(PERIOD_OPTIONS)('%s días: periodo y anterior tienen el mismo tamaño y no se solapan', (days) => {
    const r = periodRanges(NOW, days)
    const span = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000 + 1
    expect(span(r.start, r.end)).toBe(days)
    expect(span(r.previousStart, r.previousEnd)).toBe(days)
    expect(new Date(r.previousEnd).getTime() + 86_400_000).toBe(new Date(r.start).getTime())
  })

  it('cruza correctamente fin de mes y de año', () => {
    const r = periodRanges(new Date('2027-01-03T12:00:00Z'), 7)
    expect(r.end).toBe('2027-01-01')
    expect(r.start).toBe('2026-12-26')
    expect(r.previousEnd).toBe('2026-12-25')
  })
})

describe('isPeriodDays', () => {
  it.each([7, 28, 90, 365])('acepta %s', (n) => expect(isPeriodDays(n)).toBe(true))
  it.each([0, 1, 30, 91, 366, -7, NaN])('rechaza %s', (n) => expect(isPeriodDays(n)).toBe(false))
})

describe('availablePeriods', () => {
  const find = (list: ReturnType<typeof availablePeriods>, days: number) => list.find((p) => p.days === days)!

  it('un canal antiguo ofrece todos los periodos y todos comparables', () => {
    const list = availablePeriods('2015-03-01T00:00:00Z', NOW)
    expect(list.every((p) => p.available && p.comparable)).toBe(true)
  })

  it('un canal de 40 días: 7 y 28 disponibles, 90 y 365 no; el 28 no es comparable (el anterior es anterior al canal)', () => {
    const published = new Date(NOW.getTime() - 40 * 86_400_000).toISOString()
    const list = availablePeriods(published, NOW)
    expect(find(list, 7)).toMatchObject({ available: true, comparable: true })
    expect(find(list, 28)).toMatchObject({ available: true, comparable: false })
    expect(find(list, 90).available).toBe(false)
    expect(find(list, 365).available).toBe(false)
  })

  it('un canal creado ayer no ofrece ningún periodo', () => {
    const list = availablePeriods(new Date(NOW.getTime() - 86_400_000).toISOString(), NOW)
    expect(list.some((p) => p.available)).toBe(false)
  })

  it.each([null, 'fecha rota'])('sin fecha de creación válida (%s) se ofrece el periodo pero NO se asegura la comparación', (value) => {
    const list = availablePeriods(value, NOW)
    expect(list.every((p) => p.available && !p.comparable)).toBe(true)
  })
})

describe('parseTotals', () => {
  const headers = ['views', 'estimatedMinutesWatched', 'averageViewDuration', 'averageViewPercentage', 'likes', 'comments', 'shares', 'subscribersGained', 'subscribersLost'].map((name) => ({ name }))

  it('lee la fila de totales por nombre de columna, no por posición fija', () => {
    const report: AnalyticsReport = { columnHeaders: headers, rows: [[1000, 250, 42, 55.5, 80, 12, 5, 30, 4]] }
    expect(parseTotals(report)).toEqual({
      views: 1000, estimatedMinutesWatched: 250, averageViewDuration: 42, averageViewPercentage: 55.5,
      likes: 80, comments: 12, shares: 5, subscribersGained: 30, subscribersLost: 4, netSubscribers: 26
    })
  })

  it('el orden de las columnas no importa', () => {
    const report: AnalyticsReport = { columnHeaders: [{ name: 'subscribersLost' }, { name: 'views' }, { name: 'subscribersGained' }], rows: [[2, 100, 10]] }
    expect(parseTotals(report)).toMatchObject({ views: 100, subscribersGained: 10, subscribersLost: 2, netSubscribers: 8 })
  })

  it('SIN fila (sin datos) todo es null, NO cero', () => {
    const t = parseTotals({ columnHeaders: headers, rows: [] })
    expect(Object.values(t).every((v) => v === null)).toBe(true)
  })

  it('un valor real 0 sigue siendo 0 (no se confunde con "no hay dato")', () => {
    const t = parseTotals({ columnHeaders: [{ name: 'views' }, { name: 'likes' }], rows: [[0, 0]] })
    expect(t.views).toBe(0)
    expect(t.likes).toBe(0)
  })

  it('una columna que no se pidió es null', () => {
    const t = parseTotals({ columnHeaders: [{ name: 'views' }], rows: [[5]] })
    expect(t.likes).toBeNull()
    expect(t.netSubscribers).toBeNull()
  })

  it('un valor no numérico es null', () => {
    const t = parseTotals({ columnHeaders: [{ name: 'views' }], rows: [['abc']] })
    expect(t.views).toBeNull()
  })

  it('sin cabeceras no lanza', () => {
    expect(parseTotals({})).toMatchObject({ views: null })
  })
})

describe('parseDaySeries', () => {
  const report: AnalyticsReport = {
    columnHeaders: [{ name: 'day' }, { name: 'views' }, { name: 'subscribersGained' }, { name: 'subscribersLost' }],
    rows: [['2026-10-20', 10, 2, 0], ['2026-10-22', 5, 1, 1]]
  }

  it('devuelve solo los días que Google da: el 21 NO se rellena con ceros', () => {
    const series = parseDaySeries(report)
    expect(series.map((d) => d.date)).toEqual(['2026-10-20', '2026-10-22'])
  })

  it('lee las columnas por nombre y las no pedidas son null', () => {
    expect(parseDaySeries(report)[0]).toEqual({ date: '2026-10-20', views: 10, estimatedMinutesWatched: null, subscribersGained: 2, subscribersLost: 0 })
  })

  it('sin columna day o sin filas devuelve una lista vacía', () => {
    expect(parseDaySeries({ columnHeaders: [{ name: 'views' }], rows: [[1]] })).toEqual([])
    expect(parseDaySeries({ columnHeaders: [{ name: 'day' }], rows: [] })).toEqual([])
    expect(parseDaySeries({})).toEqual([])
  })
})

describe('delta', () => {
  it('calcula diferencia absoluta y porcentaje con un decimal', () => {
    expect(delta(150, 100, true)).toEqual({ abs: 50, pct: 50 })
    expect(delta(80, 100, true)).toEqual({ abs: -20, pct: -20 })
    expect(delta(101, 300, true)).toEqual({ abs: -199, pct: -66.3 })
  })

  it('NO da porcentaje si el periodo anterior es incompleto, aunque dé la diferencia', () => {
    expect(delta(150, 100, false)).toEqual({ abs: 50, pct: null })
  })

  it('NO da porcentaje si el valor anterior es 0 (división sin sentido)', () => {
    expect(delta(50, 0, true)).toEqual({ abs: 50, pct: null })
  })

  it('con cualquier valor desconocido no hay diferencia ni porcentaje', () => {
    expect(delta(null, 100, true)).toEqual({ abs: null, pct: null })
    expect(delta(100, null, true)).toEqual({ abs: null, pct: null })
    expect(delta(null, null, true)).toEqual({ abs: null, pct: null })
  })

  it('de 0 a 0 la diferencia es 0 y no hay porcentaje', () => {
    expect(delta(0, 0, true)).toEqual({ abs: 0, pct: null })
  })

  it('una bajada a 0 es -100 %', () => {
    expect(delta(0, 40, true)).toEqual({ abs: -40, pct: -100 })
  })
})

describe('compareTotals', () => {
  const totals = (views: number | null) => parseTotals({ columnHeaders: [{ name: 'views' }], rows: views === null ? [] : [[views]] })

  it('compara todos los campos y deja null los desconocidos', () => {
    const c = compareTotals(totals(200), totals(100), true)
    expect(c.views).toEqual({ abs: 100, pct: 100 })
    expect(c.likes).toEqual({ abs: null, pct: null })
  })

  it('con periodo anterior incompleto no hay porcentajes en ningún campo', () => {
    const c = compareTotals(totals(200), totals(100), false)
    expect(Object.values(c).every((d) => d.pct === null)).toBe(true)
    expect(c.views.abs).toBe(100)
  })

  it('sin datos del periodo anterior no inventa nada', () => {
    const c = compareTotals(totals(200), totals(null), true)
    expect(c.views).toEqual({ abs: null, pct: null })
  })
})

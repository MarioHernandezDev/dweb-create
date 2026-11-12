import { describe, expect, it } from 'vitest'
import {
  historyCounts, historyPoints, historySeries, historySummary, historySummaryText, type SnapshotRow
} from '../../../app/_disabled/social-metrics/utils/account-history-view'

const row = (day: string, followers: number | null, views: number | null = null): SnapshotRow => ({ observed_on: day, followers_count: followers, views_total: views, videos_count: null })

describe('historyPoints', () => {
  it('ordena por fecha, ignora los null y no duplica días', () => {
    const pts = historyPoints([row('2026-10-12', 120), row('2026-10-10', 100), row('2026-10-11', null), row('2026-10-12', 121)], 'followers')
    expect(pts).toEqual([{ date: '2026-10-10', value: 100 }, { date: '2026-10-12', value: 121 }])
  })
  it('un 0 real es un punto; fechas con formato raro se descartan', () => {
    expect(historyPoints([row('2026-10-10', 0), row('mañana', 5)], 'followers')).toEqual([{ date: '2026-10-10', value: 0 }])
  })
  it('las métricas son independientes', () => {
    const rows = [row('2026-10-10', 1, null), row('2026-10-11', null, 500)]
    expect(historyPoints(rows, 'followers')).toHaveLength(1)
    expect(historyPoints(rows, 'views')).toEqual([{ date: '2026-10-11', value: 500 }])
    expect(historyCounts(rows)).toEqual({ followers: 1, views: 1 })
  })
})

describe('historySeries', () => {
  it('con menos de 2 puntos no hay evolución', () => {
    expect(historySeries([], 'followers')).toBeNull()
    expect(historySeries([row('2026-10-10', 100)], 'followers')).toBeNull()
    expect(historySeries([row('2026-10-10', 100), row('2026-10-11', null)], 'followers')).toBeNull()
  })
  it('los días sin registro son HUECOS (null), no se interpolan ni se rellenan', () => {
    const s = historySeries([row('2026-10-10', 100), row('2026-10-13', 130)], 'followers')!
    expect(s.current.map((p) => p.date)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'])
    expect(s.current.map((p) => p.value)).toEqual([100, null, null, 130])
    expect(s.gaps).toBe(2)
    expect(s.previous).toBeNull()
  })
  it('respeta el tope de días (los más recientes)', () => {
    const rows = [row('2026-01-01', 1), row('2026-10-01', 50), row('2026-10-05', 60)]
    const s = historySeries(rows, 'followers', 10)!
    expect(s.current[0]!.date).toBe('2026-10-01')
    expect(s.current).toHaveLength(5)
  })
})

describe('historySummary', () => {
  it('variación entre el primer y el último registro con porcentaje', () => {
    const s = historySummary([row('2026-10-12', 12100), row('2026-10-30', 12400)], 'followers')!
    expect(s).toMatchObject({ abs: 300, pct: 2.5, spanDays: 18, recordedDays: 2 })
    expect(historySummaryText(s)).toBe('De 12.100 (12 oct) a 12.400 (30 oct): +300 (+2,5 %) en 18 días')
  })
  it('sin porcentaje si el primer valor es 0 (no se divide por cero)', () => {
    const s = historySummary([row('2026-10-10', 0), row('2026-10-11', 5)], 'followers')!
    expect(s.pct).toBeNull()
    expect(historySummaryText(s)).toBe('De 0 (10 oct) a 5 (11 oct): +5 en 1 día')
  })
  it('bajadas con signo negativo y sin datos suficientes -> null', () => {
    const s = historySummary([row('2026-10-10', 200), row('2026-10-12', 150)], 'followers')!
    expect(historySummaryText(s)).toContain('-50 (-25 %)')
    expect(historySummary([row('2026-10-10', 1)], 'followers')).toBeNull()
  })
})

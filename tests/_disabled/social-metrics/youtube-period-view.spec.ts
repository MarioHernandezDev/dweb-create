import { describe, expect, it } from 'vitest'
import {
  CHART_METRICS, PERIOD_DAYS, chartSeries, formatChartValue, formatRangeLabel, formatDuration, formatHours, formatPercent, formatSigned, periodKpis, periodLabel,
  type ComparisonDto, type DayPointDto, type PeriodTotalsDto
} from '../../../app/_disabled/social-metrics/utils/youtube-period-view'

const nullTotals: PeriodTotalsDto = {
  views: null, estimatedMinutesWatched: null, averageViewDuration: null, averageViewPercentage: null,
  likes: null, comments: null, shares: null, subscribersGained: null, subscribersLost: null, netSubscribers: null
}
const totals = (over: Partial<PeriodTotalsDto> = {}): PeriodTotalsDto => ({ ...nullTotals, ...over })
const noDelta = { abs: null, pct: null }
const comparison = (over: Partial<ComparisonDto> = {}): ComparisonDto => Object.fromEntries(Object.keys(nullTotals).map((k) => [k, noDelta])) as ComparisonDto & Record<string, unknown> & ComparisonDto && { ...(Object.fromEntries(Object.keys(nullTotals).map((k) => [k, noDelta])) as ComparisonDto), ...over }
const kpi = (r: Parameters<typeof periodKpis>[0], key: string) => periodKpis(r).find((k) => k.key === key)!

describe('formatos', () => {
  it.each([[0, '0:00'], [75, '1:15'], [59.6, '1:00'], [3725, '1:02:05'], [-5, '0:00']])('duración %s s -> %s', (s, out) => {
    expect(formatDuration(s)).toBe(out)
  })

  it.each([[45, '45 min'], [59.4, '59 min'], [90, '1,5 h'], [600, '10 h']])('tiempo %s min -> %s', (m, out) => {
    expect(formatHours(m)).toBe(out)
  })

  it('formatea porcentajes con un decimal y coma', () => {
    expect(formatPercent(45.34)).toBe('45,3 %')
  })

  it.each([[5, '+5'], [-5, '-5'], [0, '0']])('signo de %s -> %s', (n, out) => {
    expect(formatSigned(n)).toBe(out)
  })

  it('etiqueta del periodo', () => {
    expect(periodLabel(28)).toBe('Últimos 28 días')
  })
})

describe('periodKpis', () => {
  it('devuelve las 8 métricas del periodo, todas con origen YouTube y ninguna protagonista', () => {
    const list = periodKpis({ totals: totals({ views: 100 }), comparison: null })
    expect(list.map((k) => k.key)).toEqual(['views', 'estimatedMinutesWatched', 'netSubscribers', 'averageViewDuration', 'averageViewPercentage', 'likes', 'comments', 'shares'])
    expect(list.every((k) => k.source === 'youtube' && !k.hero)).toBe(true)
  })

  it('un dato que Google no da es "—" con motivo, NO 0', () => {
    const k = kpi({ totals: totals(), comparison: null }, 'likes')
    expect(k.value).toBeNull()
    expect(k.reason).toMatch(/no ha devuelto/)
    expect(k.delta).toBeNull()
  })

  it('un 0 real se muestra como 0 (no se confunde con "sin dato")', () => {
    const k = kpi({ totals: totals({ likes: 0 }), comparison: null }, 'likes')
    expect(k.value).toBe('0')
    expect(k.reason).toBeNull()
  })

  it('formatea cada métrica en su unidad', () => {
    const r = { totals: totals({ estimatedMinutesWatched: 90, averageViewDuration: 75, averageViewPercentage: 45.34, netSubscribers: 12 }), comparison: null }
    expect(kpi(r, 'estimatedMinutesWatched').value).toBe('1,5 h')
    expect(kpi(r, 'averageViewDuration').value).toBe('1:15')
    expect(kpi(r, 'averageViewPercentage').value).toBe('45,3 %')
    expect(kpi(r, 'netSubscribers').value).toBe('+12')
  })

  it('suscriptores netos negativos llevan signo', () => {
    expect(kpi({ totals: totals({ netSubscribers: -4 }), comparison: null }, 'netSubscribers').value).toBe('-4')
  })

  describe('variación', () => {
    it('sin comparación no hay variación en ninguna tarjeta', () => {
      expect(periodKpis({ totals: totals({ views: 100 }), comparison: null }).every((k) => k.delta === null)).toBe(true)
    })

    it('con porcentaje válido lo muestra con signo y el tono según el sentido', () => {
      const up = kpi({ totals: totals({ views: 150 }), comparison: comparison({ views: { abs: 50, pct: 50 } }) }, 'views')
      expect(up.delta).toEqual({ text: '+50 %', tone: 'good', label: 'vs. periodo anterior' })
      const down = kpi({ totals: totals({ views: 80 }), comparison: comparison({ views: { abs: -20, pct: -20 } }) }, 'views')
      expect(down.delta).toEqual({ text: '-20 %', tone: 'bad', label: 'vs. periodo anterior' })
    })

    it('sin porcentaje (periodo anterior 0) muestra SOLO la diferencia absoluta y lo avisa', () => {
      const k = kpi({ totals: totals({ views: 50 }), comparison: comparison({ views: { abs: 50, pct: null } }) }, 'views')
      expect(k.delta).toEqual({ text: '+50', tone: 'good', label: 'vs. periodo anterior (sin %)' })
    })

    it('sin cambio es neutro', () => {
      const k = kpi({ totals: totals({ views: 50 }), comparison: comparison({ views: { abs: 0, pct: null } }) }, 'views')
      expect(k.delta?.tone).toBe('neutral')
    })

    it('la diferencia absoluta de la duración se escribe en minutos y segundos', () => {
      const k = kpi({ totals: totals({ averageViewDuration: 100 }), comparison: comparison({ averageViewDuration: { abs: 25, pct: null } }) }, 'averageViewDuration')
      expect(k.delta?.text).toBe('+0:25')
    })

    it('la diferencia del % medio visto se da en puntos porcentuales', () => {
      const k = kpi({ totals: totals({ averageViewPercentage: 50 }), comparison: comparison({ averageViewPercentage: { abs: 2.5, pct: null } }) }, 'averageViewPercentage')
      expect(k.delta?.text).toBe('+2,5 pp')
    })

    it('una tarjeta sin valor no muestra variación aunque el servidor mande una', () => {
      const k = kpi({ totals: totals({ views: null }), comparison: comparison({ views: { abs: 5, pct: 5 } }) }, 'views')
      expect(k.delta).toBeNull()
    })
  })
})

describe('chartSeries', () => {
  const report = (series: DayPointDto[], previous: DayPointDto[] | null = null) => ({
    days: 4,
    range: { start: '2026-10-10', end: '2026-10-13' },
    previousRange: previous ? { start: '2026-10-06', end: '2026-10-09' } : null,
    series,
    previousSeries: previous
  })
  const day = (date: string, views: number | null, gained: number | null = null, lost: number | null = null, minutes: number | null = null): DayPointDto =>
    ({ date, views, estimatedMinutesWatched: minutes, subscribersGained: gained, subscribersLost: lost })

  it('genera un punto por cada día del periodo, aunque Google no devuelva todos', () => {
    const s = chartSeries(report([day('2026-10-10', 5), day('2026-10-13', 9)]), 'views')
    expect(s.current.map((p) => p.date)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'])
  })

  it('los días sin dato son HUECOS (null), no ceros, y se cuentan', () => {
    const s = chartSeries(report([day('2026-10-10', 5), day('2026-10-13', 9)]), 'views')
    expect(s.current.map((p) => p.value)).toEqual([5, null, null, 9])
    expect(s.gaps).toBe(2)
  })

  it('un día real con 0 vistas es 0, no hueco', () => {
    const s = chartSeries(report([day('2026-10-10', 0), day('2026-10-11', 3), day('2026-10-12', 3), day('2026-10-13', 3)]), 'views')
    expect(s.current[0]!.value).toBe(0)
    expect(s.gaps).toBe(0)
  })

  it('suscriptores netos = ganados - perdidos, y null si falta alguno', () => {
    const s = chartSeries(report([day('2026-10-10', 1, 5, 2), day('2026-10-11', 1, 5, null)]), 'subscribers')
    expect(s.current[0]!.value).toBe(3)
    expect(s.current[1]!.value).toBeNull()
  })

  it('tiempo visto usa los minutos', () => {
    const s = chartSeries(report([day('2026-10-10', 1, null, null, 42)]), 'watch')
    expect(s.current[0]!.value).toBe(42)
  })

  it('el periodo anterior se alinea día a día con el actual', () => {
    const s = chartSeries(report([day('2026-10-10', 10)], [day('2026-10-06', 4), day('2026-10-09', 8)]), 'views')
    expect(s.previous!.map((p) => p.date)).toEqual(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])
    expect(s.previous!.map((p) => p.value)).toEqual([4, null, null, 8])
    expect(s.previous!.length).toBe(s.current.length)
  })

  it('sin comparación el anterior es null', () => {
    expect(chartSeries(report([day('2026-10-10', 1)]), 'views').previous).toBeNull()
  })

  it('las etiquetas son fechas legibles en español, en UTC (sin desfase de día)', () => {
    const s = chartSeries(report([]), 'views')
    expect(s.current[0]!.label).toMatch(/10/)
    expect(s.current[0]!.label.toLowerCase()).toMatch(/oct/)
  })
})

describe('formatChartValue', () => {
  it.each([['views', 12345, '12.345'], ['subscribers', 5, '+5'], ['subscribers', -3, '-3'], ['watch', 90, '1,5 h']] as const)('%s %s -> %s', (metric, v, out) => {
    expect(formatChartValue(metric, v)).toBe(out)
  })
})

describe('etiquetas y rangos', () => {
  it('las pestañas de métrica son CORTAS (en móvil tres pestañas largas se parten en dos líneas)', () => {
    for (const m of CHART_METRICS) expect(m.label.length).toBeLessThanOrEqual(12)
  })

  it('cada pestaña conserva el nombre completo de la métrica para textos y tooltips', () => {
    expect(CHART_METRICS.map((m) => m.unit)).toEqual(['visualizaciones', 'suscriptores netos', 'tiempo visto'])
  })

  it('los periodos del selector son los mismos que acepta el servidor', () => {
    expect([...PERIOD_DAYS]).toEqual([7, 28, 90, 365])
  })

  it('formatea el rango sin desfase de día (UTC)', () => {
    const label = formatRangeLabel({ start: '2026-10-01', end: '2026-10-28' })
    expect(label).toMatch(/^1 oct/)
    expect(label).toMatch(/28 oct$/)
  })
})

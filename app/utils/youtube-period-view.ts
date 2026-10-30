/**
 * Presentación del informe por periodos de YouTube (A-R16c.2): convierte la
 * respuesta de `GET /api/social/youtube-analytics` en tarjetas con variación
 * y en series para la gráfica. Pura y sin Vue, para probar las reglas:
 *  - Un dato que Google no da es `null` y se muestra "—" con motivo, nunca 0.
 *  - Los días sin dato son HUECOS en la serie, no ceros.
 *  - Sin porcentaje de variación si el servidor no lo da (periodo anterior
 *    incompleto o 0): se muestra solo la diferencia absoluta, rotulada.
 */
import { formatCompactNumber } from './mock-data'
import type { Kpi } from './youtube-kpi'

// --- Forma de la respuesta del servidor (espejo de server/utils/youtube-period.ts) -----------------------------

export interface PeriodTotalsDto {
  views: number | null
  estimatedMinutesWatched: number | null
  averageViewDuration: number | null
  averageViewPercentage: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  subscribersGained: number | null
  subscribersLost: number | null
  netSubscribers: number | null
}

export interface DeltaDto {
  abs: number | null
  pct: number | null
}

export type ComparisonDto = { [K in keyof PeriodTotalsDto]: DeltaDto }

export interface DayPointDto {
  date: string
  views: number | null
  estimatedMinutesWatched: number | null
  subscribersGained: number | null
  subscribersLost: number | null
}

export interface AvailablePeriodDto {
  days: 7 | 28 | 90 | 365
  available: boolean
  comparable: boolean
}

export interface AnalyticsReportDto {
  days: number
  range: { start: string; end: string }
  previousRange: { start: string; end: string } | null
  availablePeriods: AvailablePeriodDto[]
  totals: PeriodTotalsDto
  previousTotals: PeriodTotalsDto | null
  comparison: ComparisonDto | null
  series: DayPointDto[]
  previousSeries: DayPointDto[] | null
  coverage: { expectedDays: number; returnedDays: number }
}

/** Periodos que ofrece el selector (los mismos que acepta el servidor). */
export const PERIOD_DAYS = [7, 28, 90, 365] as const

// --- Formato ------------------------------------------------------------------------------------------------------

const oneDecimal = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })
const exactFormat = new Intl.NumberFormat('es-ES')

export function formatHours(minutes: number): string {
  if (minutes < 60) return `${exactFormat.format(Math.round(minutes))} min`
  const hours = minutes / 60
  return `${hours >= 1000 ? formatCompactNumber(Math.round(hours)) : oneDecimal.format(hours)} h`
}

/** 75 -> "1:15"; 3725 -> "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function formatPercent(value: number): string {
  return `${oneDecimal.format(value)} %`
}

export function formatSigned(value: number, format: (n: number) => string = (n) => exactFormat.format(n)): string {
  if (value > 0) return `+${format(value)}`
  if (value < 0) return `-${format(Math.abs(value))}`
  return format(0)
}

// --- Tarjetas del periodo ---------------------------------------------------------------------------------------------

export interface KpiDelta {
  /** "+12,5 %" o, sin porcentaje válido, la diferencia absoluta ("+120"). */
  text: string
  tone: 'good' | 'bad' | 'neutral'
  /** Qué se compara; avisa cuando NO hay porcentaje. */
  label: string
}

export interface PeriodKpi extends Kpi {
  delta: KpiDelta | null
}

interface Spec {
  key: keyof PeriodTotalsDto
  label: string
  icon: string
  hint: string
  format: (n: number) => string
  /** Cómo se escribe la MAGNITUD de la diferencia absoluta, sin signo (el signo lo añade `buildDelta`). Por defecto, igual que el valor. */
  formatDelta?: (n: number) => string
  exact?: (n: number) => string
  emptyReason: string
}

const SPECS: Spec[] = [
  {
    key: 'views', label: 'Visualizaciones', icon: 'ph:eye-fill', format: (n) => formatCompactNumber(n), exact: (n) => exactFormat.format(n),
    hint: 'Veces que se han visto tus vídeos en el periodo.', emptyReason: 'YouTube no ha devuelto este dato para el periodo'
  },
  {
    key: 'estimatedMinutesWatched', label: 'Tiempo de visualización', icon: 'ph:clock-fill', format: formatHours, exact: (n) => `${exactFormat.format(Math.round(n))} min`,
    hint: 'Tiempo total que se han visto tus vídeos en el periodo.', emptyReason: 'YouTube no ha devuelto este dato para el periodo'
  },
  {
    key: 'netSubscribers', label: 'Suscriptores netos', icon: 'ph:user-plus-fill', format: (n) => formatSigned(n, (v) => formatCompactNumber(v)), exact: (n) => formatSigned(n),
    formatDelta: (n) => exactFormat.format(n),
    hint: 'Suscriptores ganados menos perdidos en el periodo (no es el total del canal).', emptyReason: 'YouTube no ha devuelto ganados y perdidos'
  },
  {
    key: 'averageViewDuration', label: 'Duración media de visualización', icon: 'ph:timer-fill', format: formatDuration,
    hint: 'Tiempo medio que se ve cada visualización.', emptyReason: 'YouTube no ha devuelto este dato para el periodo'
  },
  {
    key: 'averageViewPercentage', label: '% medio visto', icon: 'ph:percent-fill', format: formatPercent,
    formatDelta: (n) => `${oneDecimal.format(n)} pp`,
    hint: 'Porcentaje medio de cada vídeo que se ve. La variación se da en puntos porcentuales (pp).', emptyReason: 'YouTube no ha devuelto este dato para el periodo'
  },
  {
    key: 'likes', label: 'Me gusta', icon: 'ph:thumbs-up-fill', format: (n) => formatCompactNumber(n), exact: (n) => exactFormat.format(n),
    hint: 'Me gusta recibidos en el periodo.', emptyReason: 'YouTube no ha devuelto este dato para el periodo'
  },
  {
    key: 'comments', label: 'Comentarios', icon: 'ph:chat-circle-text-fill', format: (n) => formatCompactNumber(n), exact: (n) => exactFormat.format(n),
    hint: 'Comentarios recibidos en el periodo.', emptyReason: 'YouTube no ha devuelto este dato para el periodo'
  },
  {
    key: 'shares', label: 'Compartidos', icon: 'ph:share-network-fill', format: (n) => formatCompactNumber(n), exact: (n) => exactFormat.format(n),
    hint: 'Veces que se han compartido tus vídeos en el periodo.', emptyReason: 'YouTube no ha devuelto este dato para el periodo'
  }
]

/** Métricas que son un recuento acumulable (se animan al aparecer); las medias, porcentajes y netos se muestran de golpe. */
const COUNTABLE = new Set<keyof PeriodTotalsDto>(['views', 'estimatedMinutesWatched', 'likes', 'comments', 'shares'])

function buildDelta(spec: Spec, delta: DeltaDto | undefined): KpiDelta | null {
  if (!delta || delta.abs === null) return null
  const tone: KpiDelta['tone'] = delta.abs > 0 ? 'good' : delta.abs < 0 ? 'bad' : 'neutral'
  if (delta.pct !== null) {
    return { text: formatSigned(delta.pct, (n) => formatPercent(n)), tone, label: 'vs. periodo anterior' }
  }
  const fmt = spec.formatDelta ?? spec.format
  return { text: formatSigned(delta.abs, fmt), tone, label: 'vs. periodo anterior (sin %)' }
}

/** "1 oct – 28 oct" a partir de dos fechas AAAA-MM-DD (en UTC, sin desfase de día). */
export function formatRangeLabel(range: { start: string; end: string }): string {
  return `${dayLabel(range.start)} – ${dayLabel(range.end)}`
}

export function periodLabel(days: number): string {
  return `Últimos ${days} días`
}

export function periodKpis(report: Pick<AnalyticsReportDto, 'totals' | 'comparison'>): PeriodKpi[] {
  return SPECS.map((spec) => {
    const raw = report.totals[spec.key]
    return {
      key: spec.key as PeriodKpi['key'],
      label: spec.label,
      value: raw === null ? null : spec.format(raw),
      exact: raw === null ? null : (spec.exact ? spec.exact(raw) : spec.format(raw)),
      reason: raw === null ? spec.emptyReason : null,
      hero: false,
      icon: spec.icon,
      hint: spec.hint,
      source: 'youtube',
      delta: raw === null ? null : buildDelta(spec, report.comparison?.[spec.key]),
      ...(raw !== null && COUNTABLE.has(spec.key) ? { count: { to: raw, format: spec.format } } : {})
    }
  })
}

// --- Serie de la gráfica --------------------------------------------------------------------------------------------

export type ChartMetric = 'views' | 'subscribers' | 'watch'

/** Etiquetas CORTAS a propósito: en móvil tres pestañas largas se parten en dos líneas. `unit` es el nombre completo. */
export const CHART_METRICS: { value: ChartMetric; label: string; unit: string }[] = [
  { value: 'views', label: 'Vistas', unit: 'visualizaciones' },
  { value: 'subscribers', label: 'Suscriptores', unit: 'suscriptores netos' },
  { value: 'watch', label: 'Tiempo', unit: 'tiempo visto' }
]

export interface ChartPoint {
  date: string
  label: string
  value: number | null
}

export interface ChartSeries {
  current: ChartPoint[]
  /** Periodo anterior alineado día a día con el actual (día 1 con día 1…); `null` si no hay comparación. */
  previous: ChartPoint[] | null
  /** Días del periodo actual SIN dato (huecos, no ceros). */
  gaps: number
}

function metricValue(point: DayPointDto, metric: ChartMetric): number | null {
  if (metric === 'views') return point.views
  if (metric === 'watch') return point.estimatedMinutesWatched
  return point.subscribersGained !== null && point.subscribersLost !== null ? point.subscribersGained - point.subscribersLost : null
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function expandRange(start: string, days: number, points: DayPointDto[], metric: ChartMetric): ChartPoint[] {
  const byDate = new Map(points.map((p) => [p.date, p]))
  const startMs = new Date(`${start}T00:00:00Z`).getTime()
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startMs + i * 86_400_000).toISOString().slice(0, 10)
    const point = byDate.get(date)
    return { date, label: dayLabel(date), value: point ? metricValue(point, metric) : null }
  })
}

export function chartSeries(report: Pick<AnalyticsReportDto, 'days' | 'range' | 'previousRange' | 'series' | 'previousSeries'>, metric: ChartMetric): ChartSeries {
  const current = expandRange(report.range.start, report.days, report.series, metric)
  const previous = report.previousRange && report.previousSeries ? expandRange(report.previousRange.start, report.days, report.previousSeries, metric) : null
  return { current, previous, gaps: current.filter((p) => p.value === null).length }
}

// --- Mini-tendencias de las tarjetas ------------------------------------------------------------------

export type SparkKey = 'views' | 'estimatedMinutesWatched' | 'netSubscribers'

/** Menos de esto no es una tendencia, es un par de puntos. */
export const MIN_SPARK_POINTS = 5

/**
 * Valores diarios para la mini-gráfica de una tarjeta, o `null` si no se puede
 * dibujar con honestidad: solo si hay un dato por CADA día del periodo (una
 * línea que une los días con dato taparía los huecos) y al menos
 * `MIN_SPARK_POINTS` días. Nunca se rellena nada con ceros.
 */
export function sparkValues(series: DayPointDto[], key: SparkKey, expectedDays: number): number[] | null {
  if (expectedDays < MIN_SPARK_POINTS || series.length !== expectedDays) return null
  const values: number[] = []
  for (const p of series) {
    const v = key === 'netSubscribers'
      ? (p.subscribersGained !== null && p.subscribersLost !== null ? p.subscribersGained - p.subscribersLost : null)
      : p[key]
    if (v === null) return null
    values.push(v)
  }
  return values
}

/** Formatea el valor de un punto según la métrica de la gráfica. */
export function formatChartValue(metric: ChartMetric, value: number): string {
  if (metric === 'watch') return formatHours(value)
  if (metric === 'subscribers') return formatSigned(value)
  return exactFormat.format(value)
}

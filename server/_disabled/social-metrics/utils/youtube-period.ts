/**
 * Lógica pura del informe por periodos de YouTube (A-R16b): rangos de fechas,
 * qué periodos tienen sentido según la edad del canal, lectura de las
 * respuestas de la YouTube Analytics API y cálculo de comparaciones. Sin
 * Nitro ni red, para probarla con tests unitarios.
 *
 * Reglas (requisito A-R16, "no inventar datos"):
 *  - Un dato ausente es `null`, nunca 0.
 *  - Un periodo solo se ofrece si el canal ya existía durante todo él.
 *  - La variación porcentual solo se calcula si el periodo anterior es
 *    completo (el canal ya existía) y su valor es mayor que 0.
 */

export const PERIOD_OPTIONS = [7, 28, 90, 365] as const
export type PeriodDays = (typeof PERIOD_OPTIONS)[number]

/** YouTube Analytics tarda 1-2 días en procesar: pedir "hasta hoy" devolvería días vacíos. */
export const ANALYTICS_LAG_DAYS = 2

const DAY_MS = 86_400_000

export function isPeriodDays(value: number): value is PeriodDays {
  return (PERIOD_OPTIONS as readonly number[]).includes(value)
}

/** AAAA-MM-DD en UTC. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

export interface PeriodRanges {
  start: string
  end: string
  previousStart: string
  previousEnd: string
}

/** Periodo actual de `days` días terminando hace `ANALYTICS_LAG_DAYS`, y el periodo equivalente inmediatamente anterior. */
export function periodRanges(now: Date, days: number): PeriodRanges {
  const end = addDays(now, -ANALYTICS_LAG_DAYS)
  const start = addDays(end, -(days - 1))
  const previousEnd = addDays(start, -1)
  const previousStart = addDays(previousEnd, -(days - 1))
  return { start: isoDay(start), end: isoDay(end), previousStart: isoDay(previousStart), previousEnd: isoDay(previousEnd) }
}

export interface PeriodAvailability {
  days: PeriodDays
  /** El canal ya existía durante todo el periodo (o no se sabe cuándo se creó). */
  available: boolean
  /** Además, el periodo anterior también es completo: se puede comparar con porcentaje. */
  comparable: boolean
}

/**
 * Qué periodos se pueden ofrecer. Con `publishedAt` desconocido no se sabe si
 * el canal es más joven: se ofrece el periodo pero NO se asegura la comparación.
 */
export function availablePeriods(channelPublishedAt: string | null, now: Date): PeriodAvailability[] {
  // Una fecha rota no puede lanzar una excepción: se trata como "no se sabe".
  const parsed = channelPublishedAt ? new Date(channelPublishedAt) : null
  const validPublished = parsed && Number.isFinite(parsed.getTime()) ? isoDay(parsed) : null
  return PERIOD_OPTIONS.map((days) => {
    const r = periodRanges(now, days)
    if (!validPublished) return { days, available: true, comparable: false }
    return { days, available: r.start >= validPublished, comparable: r.previousStart >= validPublished }
  })
}

export interface PeriodTotals {
  views: number | null
  estimatedMinutesWatched: number | null
  averageViewDuration: number | null
  averageViewPercentage: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  subscribersGained: number | null
  subscribersLost: number | null
  /** Ganados menos perdidos; `null` si falta alguno de los dos. */
  netSubscribers: number | null
}

export interface AnalyticsReport {
  columnHeaders?: { name?: string }[]
  rows?: (string | number)[][]
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function columnIndex(report: AnalyticsReport): Record<string, number> {
  const index: Record<string, number> = {}
  ;(report.columnHeaders ?? []).forEach((h, i) => {
    if (h.name) index[h.name] = i
  })
  return index
}

/** Totales de un informe SIN dimensión (una sola fila). Si no hay fila, todo `null`: no hay datos, no ceros. */
export function parseTotals(report: AnalyticsReport): PeriodTotals {
  const idx = columnIndex(report)
  const row = report.rows?.[0]
  const pick = (name: string): number | null => (row && name in idx ? numberOrNull(row[idx[name]!]) : null)
  const subscribersGained = pick('subscribersGained')
  const subscribersLost = pick('subscribersLost')
  return {
    views: pick('views'),
    estimatedMinutesWatched: pick('estimatedMinutesWatched'),
    averageViewDuration: pick('averageViewDuration'),
    averageViewPercentage: pick('averageViewPercentage'),
    likes: pick('likes'),
    comments: pick('comments'),
    shares: pick('shares'),
    subscribersGained,
    subscribersLost,
    netSubscribers: subscribersGained !== null && subscribersLost !== null ? subscribersGained - subscribersLost : null
  }
}

export interface DayPoint {
  date: string
  views: number | null
  estimatedMinutesWatched: number | null
  subscribersGained: number | null
  subscribersLost: number | null
}

/**
 * Serie por día. Solo salen los días que Google devuelve: los que faltan NO
 * se rellenan con ceros (la interfaz verá el hueco).
 */
export function parseDaySeries(report: AnalyticsReport): DayPoint[] {
  const idx = columnIndex(report)
  if (!('day' in idx)) return []
  const get = (row: (string | number)[], name: string) => (name in idx ? numberOrNull(row[idx[name]!]) : null)
  return (report.rows ?? []).map((row) => ({
    date: String(row[idx.day!]),
    views: get(row, 'views'),
    estimatedMinutesWatched: get(row, 'estimatedMinutesWatched'),
    subscribersGained: get(row, 'subscribersGained'),
    subscribersLost: get(row, 'subscribersLost')
  }))
}

export interface Delta {
  /** Diferencia absoluta; `null` si falta alguno de los dos valores. */
  abs: number | null
  /** Variación en %, 1 decimal; `null` si no es significativa (periodo anterior incompleto o valor anterior 0). */
  pct: number | null
}

export function delta(current: number | null, previous: number | null, previousIsComplete: boolean): Delta {
  if (current === null || previous === null) return { abs: null, pct: null }
  const abs = current - previous
  const pct = previousIsComplete && previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null
  return { abs, pct }
}

export type TotalsComparison = { [K in keyof PeriodTotals]: Delta }

export function compareTotals(current: PeriodTotals, previous: PeriodTotals, previousIsComplete: boolean): TotalsComparison {
  const keys = Object.keys(current) as (keyof PeriodTotals)[]
  return Object.fromEntries(keys.map((k) => [k, delta(current[k], previous[k], previousIsComplete)])) as TotalsComparison
}

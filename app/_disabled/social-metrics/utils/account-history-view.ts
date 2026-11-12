/**
 * Histórico propio de acumulados de una cuenta (A-R8a / A-R16e), a partir de
 * las filas de `social_account_snapshots`. Pura y sin Vue. Reglas:
 *  - Solo hay registros de los días en que CIBERAN leyó la cuenta: los días sin
 *    registro son HUECOS en la gráfica, nunca se rellenan ni se interpolan.
 *  - Un acumulado que el proveedor no dio es `null` y no cuenta como punto.
 *  - La variación es un cálculo de CIBERAN entre el primer y el último registro;
 *    el % solo existe si el primer valor es mayor que 0.
 *  - Con menos de 2 puntos no hay evolución que dibujar.
 */
import { formatCompactNumber } from './mock-data'
import type { ChartPoint, ChartSeries } from './youtube-period-view'

export interface SnapshotRow {
  observed_on: string
  followers_count: number | null
  views_total: number | null
  videos_count: number | null
}

export type HistoryMetric = 'followers' | 'views'

export const HISTORY_METRICS: { value: HistoryMetric; label: string; unit: string }[] = [
  { value: 'followers', label: 'Suscriptores', unit: 'suscriptores totales' },
  { value: 'views', label: 'Visualizaciones', unit: 'visualizaciones totales' }
]

/** Tope de días que se dibujan (el más reciente hacia atrás). */
export const MAX_HISTORY_DAYS = 365

const DAY_MS = 86_400_000

function valueOf(row: SnapshotRow, metric: HistoryMetric): number | null {
  return metric === 'followers' ? row.followers_count : row.views_total
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** Puntos con dato real de esa métrica, del más antiguo al más reciente, sin duplicar días. */
export function historyPoints(rows: SnapshotRow[], metric: HistoryMetric): { date: string; value: number }[] {
  const byDay = new Map<string, number>()
  for (const r of rows) {
    const v = valueOf(r, metric)
    if (v !== null && Number.isFinite(v) && /^\d{4}-\d{2}-\d{2}$/.test(r.observed_on)) byDay.set(r.observed_on, v)
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }))
}

/**
 * Serie diaria desde el primer hasta el último registro con dato: los días
 * intermedios sin registro quedan como `null` (hueco). `null` si hay menos de 2 puntos.
 */
export function historySeries(rows: SnapshotRow[], metric: HistoryMetric, maxDays: number = MAX_HISTORY_DAYS): ChartSeries | null {
  const all = historyPoints(rows, metric)
  const last = all.at(-1)
  if (!last) return null
  const cutoff = new Date(`${last.date}T00:00:00Z`).getTime() - (maxDays - 1) * DAY_MS
  const points = all.filter((p) => new Date(`${p.date}T00:00:00Z`).getTime() >= cutoff)
  if (points.length < 2) return null

  const byDate = new Map(points.map((p) => [p.date, p.value]))
  const start = new Date(`${points[0]!.date}T00:00:00Z`).getTime()
  const end = new Date(`${last.date}T00:00:00Z`).getTime()
  const days = Math.round((end - start) / DAY_MS) + 1
  const current: ChartPoint[] = Array.from({ length: days }, (_, i) => {
    const date = new Date(start + i * DAY_MS).toISOString().slice(0, 10)
    return { date, label: dayLabel(date), value: byDate.get(date) ?? null }
  })
  return { current, previous: null, gaps: current.filter((p) => p.value === null).length }
}

export interface HistorySummary {
  from: { date: string; value: number }
  to: { date: string; value: number }
  /** Días naturales entre los dos registros. */
  spanDays: number
  abs: number
  /** Variación en %, 1 decimal; `null` si el primer valor es 0. */
  pct: number | null
  /** Número de días con registro (≠ días del tramo: lo que falta son huecos). */
  recordedDays: number
}

export function historySummary(rows: SnapshotRow[], metric: HistoryMetric): HistorySummary | null {
  const points = historyPoints(rows, metric)
  if (points.length < 2) return null
  const from = points[0]!
  const to = points.at(-1)!
  const spanDays = Math.round((new Date(`${to.date}T00:00:00Z`).getTime() - new Date(`${from.date}T00:00:00Z`).getTime()) / DAY_MS)
  const abs = to.value - from.value
  return { from, to, spanDays, abs, pct: from.value > 0 ? Math.round((abs / from.value) * 1000) / 10 : null, recordedDays: points.length }
}

const exact = new Intl.NumberFormat('es-ES', { useGrouping: 'always' })

/** "De 12.100 (12 oct) a 12.400 (30 oct): +300 (+2,5 %) en 18 días". */
export function historySummaryText(s: HistorySummary): string {
  const sign = s.abs > 0 ? '+' : s.abs < 0 ? '-' : ''
  const absText = `${sign}${exact.format(Math.abs(s.abs))}`
  const pctText = s.pct !== null ? ` (${s.pct > 0 ? '+' : s.pct < 0 ? '-' : ''}${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(Math.abs(s.pct))} %)` : ''
  return `De ${exact.format(s.from.value)} (${dayLabel(s.from.date)}) a ${exact.format(s.to.value)} (${dayLabel(s.to.date)}): ${absText}${pctText} en ${s.spanDays} ${s.spanDays === 1 ? 'día' : 'días'}`
}

/** Cuántos puntos con dato tiene cada métrica (para ofrecer solo las que se pueden dibujar). */
export function historyCounts(rows: SnapshotRow[]): Record<HistoryMetric, number> {
  return { followers: historyPoints(rows, 'followers').length, views: historyPoints(rows, 'views').length }
}

export { formatCompactNumber }

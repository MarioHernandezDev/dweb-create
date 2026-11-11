import type { Avg } from '~~/server/utils/collab-metrics'

/** Formato y textos de las métricas propias (components/insights). Sin dato se escribe «—», nunca un 0 inventado. */
export const NO_DATA = '—'

export function formatPct(a: Avg | null): string {
  return a ? `${Math.round(a.value * 100)} %` : NO_DATA
}

/** Horas en una unidad legible: minutos, horas o días. */
export function formatHours(a: Avg | null): string {
  if (!a) return NO_DATA
  const h = a.value
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${h < 10 ? String(Math.round(h * 10) / 10).replace('.', ',') : Math.round(h)} h`
  return `${String(Math.round((h / 24) * 10) / 10).replace('.', ',')} días`
}

export function formatDecimal(a: Avg | null, digits = 1): string {
  return a ? a.value.toFixed(digits).replace('.', ',') : NO_DATA
}

export function formatEurosAvg(a: Avg | null): string {
  return a ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(a.value / 100) : NO_DATA
}

/** «sobre 3 colaboraciones» — el tamaño de la muestra acompaña siempre a la cifra. */
export function sampleNote(a: Avg | null, singular: string, plural: string): string {
  if (!a) return 'Aún sin datos suficientes'
  return `sobre ${a.n} ${a.n === 1 ? singular : plural}`
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** '2026-09' → 'sep 26' */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${MONTHS[Number(m) - 1] ?? m} ${String(y).slice(2)}`
}

export const INSIGHT_RANGES = [
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
  { value: 'all', label: 'Todo' }
]

/** Cómo se calcula cada indicador: el mismo criterio que server/utils/collab-metrics.ts, en palabras. */
export const METRIC_NOTES: { term: string; text: string }[] = [
  { term: 'Iniciadas', text: 'Todas las colaboraciones creadas en el periodo, en cualquier estado.' },
  { term: 'Aceptadas', text: 'Las que llegaron a aceptarse, sigan abiertas o no.' },
  { term: 'Completadas con éxito', text: 'Completadas entre las que ya han terminado (completadas, canceladas o terminadas por incumplimiento). Cancelar o terminar por incumplimiento nunca cuenta como éxito, y las que siguen abiertas no entran.' },
  { term: 'Entregas a tiempo', text: 'Entregas enviadas a revisión, o publicadas, no más tarde del final del día de su fecha. Solo cuentan las que tienen fecha y ya se han entregado o han vencido.' },
  { term: 'Tiempo de respuesta', text: 'Desde que llega una solicitud hasta la primera respuesta de quien la recibe: aceptar, rechazar o contraofertar.' },
  { term: 'De propuesta a aceptación', text: 'Desde que se crea la solicitud hasta que se acepta.' },
  { term: 'Revisiones por entregable', text: 'Peticiones de cambios entre las entregas que se han enviado a revisión al menos una vez.' },
  { term: 'Presupuesto medio', text: 'Media del importe acordado en las colaboraciones aceptadas que tienen importe.' },
  { term: 'Datos antiguos', text: 'Las colaboraciones anteriores a la cronología no tienen fechas exactas: se cuentan en los totales, pero no en los tiempos.' }
]

import type { Post, PostStatus } from '~/types'

/**
 * Datos de las gráficas de resumen de «Hoy». Funciones puras: reciben las
 * publicaciones ya cargadas y la fecha de «hoy», no consultan nada. Solo
 * cuentan lo que existe; un día sin entregas es 0 de verdad, no un hueco.
 */

export interface WeekDay {
  /** Día de la semana abreviado («lun»). */
  label: string
  /** Fecha completa legible («lunes 4 de noviembre»), para el texto accesible. */
  full: string
  /** Entregas con fecha ese día y aún sin publicar. */
  pending: number
  /** Entregas con fecha ese día ya publicadas. */
  done: number
  today: boolean
}

/** Los próximos 7 días a partir de hoy (hoy incluido) con sus entregas. */
export function weekDays(posts: Pick<Post, 'dueInDays' | 'status'>[], now: Date): WeekDay[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const due = posts.filter((p) => p.dueInDays === offset)
    return {
      label: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
      full: date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
      pending: due.filter((p) => p.status !== 'published').length,
      done: due.filter((p) => p.status === 'published').length,
      today: offset === 0
    }
  })
}

/** Entregas sin publicar con la fecha ya pasada (no entran en los 7 días). */
export function overdueCount(posts: Pick<Post, 'dueInDays' | 'status'>[]): number {
  return posts.filter((p) => p.dueInDays < 0 && p.status !== 'published').length
}

export const PHASE_ORDER: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']

export interface PhaseShare { status: PostStatus; count: number; pct: number }

/** Reparto de publicaciones por fase (solo las 5 fases del tablero), en orden de avance. */
export function phaseShares(posts: Pick<Post, 'status'>[]): PhaseShare[] {
  const total = posts.filter((p) => PHASE_ORDER.includes(p.status)).length
  return PHASE_ORDER.map((status) => {
    const count = posts.filter((p) => p.status === status).length
    return { status, count, pct: total ? (count / total) * 100 : 0 }
  })
}

/** Texto alternativo de la gráfica de columnas (lo lee el lector de pantalla). */
export function weekDaysSummary(days: WeekDay[]): string {
  const parts = days.map((d) => {
    const total = d.pending + d.done
    return `${d.full}: ${total === 0 ? 'sin entregas' : `${total} ${total === 1 ? 'entrega' : 'entregas'}`}`
  })
  return `Entregas de los próximos 7 días. ${parts.join('; ')}.`
}

/**
 * Cálculo de fechas para el resumen semanal y el calendario de publicaciones. Puro y sin Vue.
 * Las publicaciones solo guardan fecha (`due_date`, «YYYY-MM-DD»), no hora, así que todo se agrupa por día.
 * Se trabaja con fechas locales para que «hoy» sea el día del usuario, no el de UTC.
 */
import type { Post } from '~/types'

export const iso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => { const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return c }

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const monthName = (m: number) => MONTHS[m]!
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export interface CalendarDay { iso: string; date: Date; label: string; day: number; isToday: boolean; inMonth: boolean }

function makeDay(d: Date, today: string, month?: number): CalendarDay {
  return { iso: iso(d), date: d, label: `${DOW[d.getDay()]} ${d.getDate()}`, day: d.getDate(), isToday: iso(d) === today, inMonth: month == null || d.getMonth() === month }
}

/** Lunes a domingo de la semana de `now`. */
export function weekDays(now = new Date()): CalendarDay[] {
  const today = iso(now)
  const monday = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -((now.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => makeDay(addDays(monday, i), today))
}

/** «2 - 8 nov» (o «30 oct - 5 nov» si cruza de mes). */
export function weekRangeLabel(days: CalendarDay[]): string {
  const a = days[0]!.date
  const b = days[6]!.date
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} - ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} - ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`
}

/** Cuadrícula del mes (semanas completas de lunes a domingo). */
export function monthGrid(year: number, month: number, now = new Date()): CalendarDay[] {
  const today = iso(now)
  const first = new Date(year, month, 1)
  const start = addDays(first, -((first.getDay() + 6) % 7))
  const last = new Date(year, month + 1, 0)
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + last.getDate()) / 7)
  return Array.from({ length: weeks * 7 }, (_, i) => makeDay(addDays(start, i), today, month))
}

export function postsByDay(posts: Post[]): Map<string, Post[]> {
  const map = new Map<string, Post[]>()
  for (const p of posts) {
    if (!p.dueDate) continue
    const key = p.dueDate.slice(0, 10)
    map.set(key, [...(map.get(key) ?? []), p])
  }
  return map
}

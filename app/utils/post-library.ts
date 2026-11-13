/**
 * Filtros y orden compartidos por el Tablero y la Lista de publicaciones
 * (A-R21). Puro y sin Vue: las dos vistas leen el MISMO conjunto de
 * `useMyPosts` y aplican exactamente estas funciones, así que con los mismos
 * filtros enseñan las mismas publicaciones.
 *
 * `project`: '' = todos · 'own' = contenido propio (sin colaboración) ·
 * cualquier otro valor = id de una colaboración (el «proyecto» en CIBERAN).
 */
import type { Platform, Post, PostStatus } from '~/types'

export type PostSort = 'due_asc' | 'due_desc' | 'created_desc' | 'updated_desc'

/** Atajos de «qué toca»: lo que se ha pasado de fecha y lo que vence en la semana en curso. */
export type QuickFilter = '' | 'overdue' | 'week'

export interface PostFilters {
  search: string
  status: PostStatus | ''
  platform: Platform | ''
  project: string
  /** Id de una etiqueta (`labels`); vacío = todas. */
  label: string
  quick: QuickFilter
}

export const POST_SORT_OPTIONS: { value: PostSort; label: string }[] = [
  { value: 'due_asc', label: 'Entrega: más próxima' },
  { value: 'due_desc', label: 'Entrega: más lejana' },
  { value: 'created_desc', label: 'Creación: más reciente' },
  { value: 'updated_desc', label: 'Modificación: más reciente' }
]

export const OWN_PROJECT = 'own'

export function emptyFilters(): PostFilters {
  return { search: '', status: '', platform: '', project: '', label: '', quick: '' }
}

export function hasActiveFilters(f: PostFilters, opts: { ignoreStatus?: boolean } = {}): boolean {
  return !!(f.search.trim() || (!opts.ignoreStatus && f.status) || f.platform || f.project || f.label || f.quick)
}

/** Texto en el que busca el buscador: título, texto de la publicación y hashtags. */
function searchable(p: Post): string {
  return `${p.title} ${p.caption} ${p.hashtags.join(' ')}`.toLowerCase()
}

/** ¿Vence (o venció) dentro de la semana natural en curso, de lunes a domingo? Las publicadas no cuentan. */
export function isDueThisWeek(p: Post, now = new Date()): boolean {
  if (p.status === 'published' || !p.dueDate) return false
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const from = iso(start)
  const to = iso(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
  return p.dueDate >= from && p.dueDate <= to
}

export function matchesFilters(p: Post, f: PostFilters, opts: { ignoreStatus?: boolean; now?: Date } = {}): boolean {
  if (f.search.trim() && !searchable(p).includes(f.search.trim().toLowerCase())) return false
  if (!opts.ignoreStatus && f.status && p.status !== f.status) return false
  if (f.platform && p.platform !== f.platform) return false
  if (f.label && !p.labelIds.includes(f.label)) return false
  if (f.quick === 'overdue' && !(p.dueInDays < 0 && p.status !== 'published')) return false
  if (f.quick === 'week' && !isDueThisWeek(p, opts.now)) return false
  if (f.project === OWN_PROJECT) return !p.collaborationId
  if (f.project && p.collaborationId !== f.project) return false
  return true
}

export function filterPosts(posts: Post[], f: PostFilters, opts: { ignoreStatus?: boolean; now?: Date } = {}): Post[] {
  return posts.filter((p) => matchesFilters(p, f, opts))
}

export function sortPosts(posts: Post[], sort: PostSort): Post[] {
  const copy = [...posts]
  const byDate = (key: 'createdAt' | 'updatedAt') => (a: Post, b: Post) => (b[key] ?? '').localeCompare(a[key] ?? '')
  switch (sort) {
    case 'due_asc': return copy.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    case 'due_desc': return copy.sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    case 'created_desc': return copy.sort(byDate('createdAt'))
    case 'updated_desc': return copy.sort(byDate('updatedAt'))
  }
}

/**
 * Publicadas en la semana natural en curso, de lunes 00:00 a domingo (objetivo semanal de «Hoy»).
 * Usa `publishedAt`; en las publicadas antes de existir ese campo (`null`) se aproxima con la
 * fecha de entrega, para que el historial antiguo no infle el objetivo de esta semana.
 */
export function publishedThisWeek(posts: Post[], now: Date): number {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return posts.filter((p) => {
    if (p.status !== 'published') return false
    const when = p.publishedAt ?? (p.dueDate ? `${p.dueDate}T12:00:00` : null)
    if (!when) return false
    const t = new Date(when).getTime()
    return Number.isFinite(t) && t >= start.getTime() && t < end.getTime()
  }).length
}

/** Cuántas cumplen cada atajo, para enseñarlo en el botón (se cuenta sobre lo que dejan pasar el resto de filtros). */
export function quickCounts(posts: Post[], f: PostFilters, opts: { ignoreStatus?: boolean; now?: Date } = {}): { overdue: number; week: number } {
  const base = filterPosts(posts, { ...f, quick: '' }, opts)
  return { overdue: base.filter((p) => p.dueInDays < 0 && p.status !== 'published').length, week: base.filter((p) => isDueThisWeek(p, opts.now)).length }
}

/** Días que una publicada sigue a la vista en el tablero antes de pasar a «anteriores». */
export const RECENT_PUBLISHED_DAYS = 30

/**
 * ¿Es una publicada de hace más de `days` días? Usa `publishedAt`; en las anteriores a existir ese campo
 * se aproxima con la fecha de entrega (igual que `publishedThisWeek`).
 */
export function isOldPublished(p: Post, now = new Date(), days = RECENT_PUBLISHED_DAYS): boolean {
  if (p.status !== 'published') return false
  const when = p.publishedAt ?? (p.dueDate ? `${p.dueDate}T12:00:00` : null)
  const t = when ? new Date(when).getTime() : NaN
  return Number.isFinite(t) && now.getTime() - t > days * 86_400_000
}

/** Resumen por proyecto para los indicadores (cálculo local sobre lo ya cargado). */
export function projectStats(posts: Post[]): { total: number; overdue: number; inReview: number; published: number } {
  return {
    total: posts.length,
    overdue: posts.filter((p) => p.dueInDays < 0 && p.status !== 'published').length,
    inReview: posts.filter((p) => p.status === 'ready_for_review').length,
    published: posts.filter((p) => p.status === 'published').length
  }
}

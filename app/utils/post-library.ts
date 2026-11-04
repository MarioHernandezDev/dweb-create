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

export interface PostFilters {
  search: string
  status: PostStatus | ''
  platform: Platform | ''
  project: string
}

export const POST_SORT_OPTIONS: { value: PostSort; label: string }[] = [
  { value: 'due_asc', label: 'Entrega: más próxima' },
  { value: 'due_desc', label: 'Entrega: más lejana' },
  { value: 'created_desc', label: 'Creación: más reciente' },
  { value: 'updated_desc', label: 'Modificación: más reciente' }
]

export const OWN_PROJECT = 'own'

export function emptyFilters(): PostFilters {
  return { search: '', status: '', platform: '', project: '' }
}

export function hasActiveFilters(f: PostFilters, opts: { ignoreStatus?: boolean } = {}): boolean {
  return !!(f.search.trim() || (!opts.ignoreStatus && f.status) || f.platform || f.project)
}

export function matchesFilters(p: Post, f: PostFilters, opts: { ignoreStatus?: boolean } = {}): boolean {
  if (f.search.trim() && !p.title.toLowerCase().includes(f.search.trim().toLowerCase())) return false
  if (!opts.ignoreStatus && f.status && p.status !== f.status) return false
  if (f.platform && p.platform !== f.platform) return false
  if (f.project === OWN_PROJECT) return !p.collaborationId
  if (f.project && p.collaborationId !== f.project) return false
  return true
}

export function filterPosts(posts: Post[], f: PostFilters, opts: { ignoreStatus?: boolean } = {}): Post[] {
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

/** Resumen por proyecto para los indicadores (cálculo local sobre lo ya cargado). */
export function projectStats(posts: Post[]): { total: number; overdue: number; inReview: number; published: number } {
  return {
    total: posts.length,
    overdue: posts.filter((p) => p.dueInDays < 0 && p.status !== 'published').length,
    inReview: posts.filter((p) => p.status === 'ready_for_review').length,
    published: posts.filter((p) => p.status === 'published').length
  }
}

import { UUID_RE, isoDay, nextDay, orIlike, searchTerm } from './admin-query'

export const ACTIVITY_TYPES = [
  'signup', 'collaboration_created', 'payment', 'collaboration_cancelled', 'collaboration_terminated',
  'pro_paid', 'pro_gifted', 'report_created', 'deletion_requested', 'admin_action'
] as const

/** Aplica los filtros del feed de actividad a una consulta sobre `admin_activity_view`. Parámetros: types (csv), q, from, to (YYYY-MM-DD), profile. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyActivityFilters<T extends { in: (c: string, v: string[]) => T; or: (f: string) => T; eq: (c: string, v: string) => T; gte: (c: string, v: string) => T; lt: (c: string, v: string) => T }>(query: T, q: Record<string, any>): T {
  let out = query
  const types = typeof q.types === 'string' ? q.types.split(',').filter((t) => (ACTIVITY_TYPES as readonly string[]).includes(t)) : []
  if (types.length) out = out.in('type', types)
  const term = searchTerm(q.q)
  if (term) out = out.or(orIlike(['summary'], term))
  if (typeof q.profile === 'string' && UUID_RE.test(q.profile)) out = out.eq('profile_id', q.profile)
  const from = isoDay(q.from)
  const to = isoDay(q.to)
  if (from) out = out.gte('created_at', `${from}T00:00:00Z`)
  if (to) out = out.lt('created_at', `${nextDay(to)}T00:00:00Z`)
  return out
}

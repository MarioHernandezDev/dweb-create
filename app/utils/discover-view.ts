/**
 * Lógica pura de la vista de Descubrir (sin Vue): filtros que se aplican en el cliente sobre lo que ya
 * devolvió el servidor (redes, tiempo de respuesta) y los órdenes. Va aparte para poder probarla sin montar nada.
 */
import type { DiscoveryResult } from '~/composables/useDiscover'

export type ResponseFilter = 'any' | '24' | '2'
export type DiscoverSort = 'affinity' | 'collabs' | 'response' | 'budget_asc' | 'budget_desc'

export const SORT_LABELS: Record<DiscoverSort, string> = {
  affinity: 'Más afines',
  collabs: 'Más colaboraciones',
  response: 'Responden antes',
  budget_asc: 'Presupuesto: de menor a mayor',
  budget_desc: 'Presupuesto: de mayor a menor',
}

/** Siglas de las redes para las etiquetas pequeñas de la tarjeta. */
export const PLATFORM_SHORT: Record<string, string> = { instagram: 'IG', tiktok: 'TT', youtube: 'YT', x: 'X', facebook: 'FB', linkedin: 'IN' }

/** Formatos que puede ofrecer una marca (`partners.collaboration_types`). */
export const COLLAB_TYPES = [
  { value: 'post', label: 'Post' },
  { value: 'reel', label: 'Reel / vídeo' },
  { value: 'stories', label: 'Stories' },
  { value: 'ambassador', label: 'Embajador/a' }
] as const

export const BUDGET_SLIDER = { min: 0, max: 5000, step: 50 } as const

/** «~2 h», «~1 día»… a partir de las horas medianas de respuesta. */
export function responseLabel(hours: number | null): string | null {
  if (hours == null) return null
  if (hours < 1) return '~1 h'
  if (hours < 24) return `~${Math.round(hours)} h`
  const days = Math.round(hours / 24)
  return `~${days} ${days === 1 ? 'día' : 'días'}`
}

export function matchesClientFilters(
  r: DiscoveryResult,
  f: { platforms: string[]; response: ResponseFilter; types?: string[]; verifiedOnly?: boolean }
): boolean {
  if (f.verifiedOnly && !r.verified) return false
  if (f.types?.length && !f.types.some((t) => r.collaborationTypes.includes(t))) return false
  if (f.platforms.length && !f.platforms.some((p) => r.platforms.includes(p))) return false
  if (f.response !== 'any') {
    const limit = f.response === '2' ? 2 : 24
    if (r.responseHours == null || r.responseHours > limit) return false
  }
  return true
}

export function sortResults(list: DiscoveryResult[], sort: DiscoverSort): DiscoveryResult[] {
  const copy = [...list]
  // Los que no tienen el dato van siempre al final, no al principio.
  const nullsLast = (get: (r: DiscoveryResult) => number | null, dir: 1 | -1) => (a: DiscoveryResult, b: DiscoveryResult) => {
    const x = get(a)
    const y = get(b)
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    return (x - y) * dir
  }
  switch (sort) {
    case 'affinity': return copy.sort((a, b) => b.score - a.score)
    case 'collabs': return copy.sort((a, b) => b.collabCount - a.collabCount || b.score - a.score)
    case 'response': return copy.sort(nullsLast((r) => r.responseHours, 1))
    case 'budget_asc': return copy.sort(nullsLast((r) => r.minCents ?? r.maxCents, 1))
    case 'budget_desc': return copy.sort(nullsLast((r) => r.maxCents ?? r.minCents, -1))
  }
}

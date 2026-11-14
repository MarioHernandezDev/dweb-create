/** Piezas comunes de los listados del admin: paginación y búsqueda segura contra la base. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface PageParams { page: number; pageSize: number; from: number; to: number }

export function pageParams(query: Record<string, unknown>, defaultSize = 25, maxSize = 100): PageParams {
  const page = Math.max(1, Math.min(100_000, Math.floor(Number(query.page)) || 1))
  const size = Math.floor(Number(query.pageSize)) || defaultSize
  const pageSize = Math.max(1, Math.min(maxSize, size))
  const from = (page - 1) * pageSize
  return { page, pageSize, from, to: from + pageSize - 1 }
}

/**
 * Texto de búsqueda listo para meter en un filtro `or(...)` de PostgREST: se quitan los caracteres que
 * tienen significado en esa sintaxis (comas, paréntesis, comodines, comillas, barras) y se recorta.
 */
export function searchTerm(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[,()%*_\\"'`:;]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

/** `col1.ilike.%term%,col2.ilike.%term%` */
export function orIlike(columns: string[], term: string): string {
  return columns.map((c) => `${c}.ilike.%${term}%`).join(',')
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export function isoDay(v: unknown): string | null {
  return typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? v : null
}

/** El día siguiente (`YYYY-MM-DD`), para que «hasta» incluya el día entero. */
export function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

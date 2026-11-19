import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Analíticas de "Descubrir" para el admin — la materia prima para ir
 * mejorando el buscador poco a poco: qué categorías pide la gente de
 * verdad, cuánta gente usa el modo IA frente a filtros normales, y qué
 * búsquedas en texto libre se están haciendo (para leerlas a mano y ver
 * patrones que ni las categorías fijas capturan). Todo sale de
 * `discovery_searches` — ver supabase/migrations/20261021150000_discovery_bidireccional.sql.
 * Sin policy de select para el cliente a propósito (mismo patrón que
 * `reports`), así que esto es la única forma de leerlo.
 */
interface SearchRow {
  searcher_role: 'creator' | 'partner'
  mode: 'filters' | 'ai'
  query_text: string | null
  filters: { categories?: string[]; aiExtractedCategories?: string[] } | null
  results_count: number
  created_at: string
}

function bucketize(dates: Date[], bucketDays: number, bucketCount: number): number[] {
  const buckets = Array.from({ length: bucketCount }, () => 0)
  const now = Date.now()
  dates.forEach((date) => {
    const ageDays = (now - date.getTime()) / 86_400_000
    const idx = bucketCount - 1 - Math.floor(ageDays / bucketDays)
    if (idx >= 0 && idx < bucketCount) buckets[idx]!++
  })
  return buckets
}

function bucketLabels(bucketDays: number, bucketCount: number): string[] {
  const now = Date.now()
  return Array.from({ length: bucketCount }, (_, i) => {
    const end = new Date(now - (bucketCount - 1 - i) * bucketDays * 86_400_000)
    return end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  })
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const bucketDays = 7
  const bucketCount = 8
  const windowStart = new Date(Date.now() - bucketDays * bucketCount * 86_400_000).toISOString()

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('discovery_searches')
    .select('searcher_role, mode, query_text, filters, results_count, created_at')
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as SearchRow[]

  const categoryCounts = new Map<string, number>()
  for (const row of rows) {
    const cats = [...(row.filters?.categories ?? []), ...(row.filters?.aiExtractedCategories ?? [])]
    for (const cat of new Set(cats)) categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([category, count]) => ({ category, count }))

  const zeroResultCount = rows.filter((r) => r.results_count === 0).length

  return {
    labels: bucketLabels(bucketDays, bucketCount),
    volume: bucketize(rows.map((r) => new Date(r.created_at)), bucketDays, bucketCount),
    totalSearches: rows.length,
    byMode: {
      filters: rows.filter((r) => r.mode === 'filters').length,
      ai: rows.filter((r) => r.mode === 'ai').length
    },
    byRole: {
      creator: rows.filter((r) => r.searcher_role === 'creator').length,
      partner: rows.filter((r) => r.searcher_role === 'partner').length
    },
    zeroResultCount,
    topCategories,
    recentQueries: rows
      .filter((r) => r.query_text)
      .slice(0, 20)
      .map((r) => ({ queryText: r.query_text, role: r.searcher_role, resultsCount: r.results_count, createdAt: r.created_at }))
  }
})

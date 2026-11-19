/**
 * Búsquedas guardadas de Descubrir («Guardar búsqueda»). Viven en la cuenta (tabla `saved_searches`, migración
 * 20261110100000): se ven desde cualquier dispositivo. Las que hubiera en este navegador de la versión anterior
 * (localStorage) se suben a la cuenta la primera vez y se borran de aquí.
 */
import type { DiscoverSort, ResponseFilter } from '~/utils/discover-view'

export interface SavedSearchState {
  categories: string[]
  minEuros: number | null
  maxEuros: number | null
  platforms: string[]
  response: ResponseFilter
  types?: string[]
  verifiedOnly?: boolean
  sort: DiscoverSort
  nameQuery: string
}
export interface SavedSearch { id: string; label: string; state: SavedSearchState }

const MAX_SAVED = 12

export function useSavedSearches(kind: 'creator' | 'partner') {
  const client = useSupabaseClient()
  const legacyKey = `ciberan:discover-searches:v1:${kind}`
  const items = useState<SavedSearch[]>(`saved-searches-${kind}`, () => [])

  function readLegacy(): SavedSearch[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(legacyKey) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter((s) => s && typeof s.label === 'string' && s.state) : []
    } catch { return [] }
  }

  async function fetchRows() {
    const { data, error } = await client.from('saved_searches' as never).select('id, label, state').eq('kind', kind).order('created_at', { ascending: false }).limit(MAX_SAVED)
    if (error) throw error
    return (data ?? []) as unknown as SavedSearch[]
  }

  async function load() {
    try {
      let rows = await fetchRows()
      const legacy = readLegacy()
      if (legacy.length) {
        const known = new Set(rows.map((r) => r.label))
        // Se insertan de la más antigua a la más reciente para conservar el orden.
        const pending = legacy.filter((s) => !known.has(s.label)).slice(0, MAX_SAVED).reverse()
        if (pending.length) {
          const { error } = await client.from('saved_searches' as never).insert(pending.map((s) => ({ kind, label: s.label.slice(0, 160), state: s.state })) as never)
          if (error) throw error
          rows = await fetchRows()
        }
        try { localStorage.removeItem(legacyKey) } catch { /* sin almacenamiento */ }
      }
      items.value = rows
    } catch (e) {
      console.error('[useSavedSearches] fallo al cargar:', (e as Error).message)
      // Sin conexión con la cuenta se enseñan, al menos, las de este navegador.
      if (!items.value.length) items.value = readLegacy()
    }
  }

  /** Devuelve `true` si se ha guardado en la cuenta. */
  async function add(label: string, state: SavedSearchState): Promise<boolean> {
    const { data, error } = await client.from('saved_searches' as never).insert({ kind, label: label.slice(0, 160), state } as never).select('id, label, state').single()
    if (error || !data) {
      console.error('[useSavedSearches] fallo al guardar:', error?.message)
      return false
    }
    items.value = [data as unknown as SavedSearch, ...items.value].slice(0, MAX_SAVED)
    return true
  }

  /** Devuelve `true` si se ha borrado. */
  async function remove(id: string): Promise<boolean> {
    const { error } = await client.from('saved_searches' as never).delete().eq('id', id)
    if (error) {
      console.error('[useSavedSearches] fallo al borrar:', error.message)
      return false
    }
    items.value = items.value.filter((s) => s.id !== id)
    return true
  }

  if (import.meta.client) onMounted(load)
  return { items, add, remove }
}

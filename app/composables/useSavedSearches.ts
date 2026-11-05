/**
 * Búsquedas guardadas de Descubrir («Guardar búsqueda»). Se guardan en este navegador (localStorage), por rol
 * de lo que se explora: no hace falta tabla ni migración, y no viaja a ningún sitio. Si el almacenamiento no está
 * disponible (ventana privada, bloqueado), simplemente no se guarda y el resto sigue funcionando.
 */
import type { DiscoverSort, ResponseFilter } from '~/utils/discover-view'

export interface SavedSearchState {
  categories: string[]
  minEuros: number | null
  maxEuros: number | null
  platforms: string[]
  response: ResponseFilter
  sort: DiscoverSort
  nameQuery: string
}
export interface SavedSearch { id: string; label: string; state: SavedSearchState }

const MAX_SAVED = 12

export function useSavedSearches(kind: 'creator' | 'partner') {
  const key = `ciberan:discover-searches:v1:${kind}`
  const items = useState<SavedSearch[]>(`saved-searches-${kind}`, () => [])

  function load() {
    try {
      const raw = localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : []
      items.value = Array.isArray(parsed) ? parsed : []
    } catch { items.value = [] }
  }
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(items.value)) } catch { /* sin almacenamiento: no se guarda */ }
  }

  function add(label: string, state: SavedSearchState) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    items.value = [{ id, label, state }, ...items.value].slice(0, MAX_SAVED)
    persist()
  }
  function remove(id: string) {
    items.value = items.value.filter((s) => s.id !== id)
    persist()
  }

  if (import.meta.client) onMounted(load)
  return { items, add, remove }
}

export interface DiscoveryResult {
  id: string
  name: string
  bio: string | null
  categories: string[]
  lookingFor: string | null
  minCents: number | null
  maxCents: number | null
  followers: number
  coverUrl: string | null
  score: number
  reason: string | null
}

export interface DiscoveryFilters {
  categories: string[]
  minBudgetCents: number | null
  maxBudgetCents: number | null
}

/**
 * Cliente de `/api/discover/search`, compartido por `/creator/discover`
 * (busca partners) y `/partner/discover` (busca creadores) — la dirección
 * la decide el propio servidor según quién llama, no hace falta pasársela.
 */
export function useDiscover() {
  // Las dos páginas de "Descubrir" lanzan la primera búsqueda en el `await`
  // de nivel superior de la página, así que esto también corre en el
  // servidor (SSR) — el `$fetch` normal no reenvía ahí la cookie de sesión
  // a una ruta interna, así que `/api/discover/search` respondería 401 en
  // el servidor aunque funcione bien desde el cliente (se ve como un
  // desajuste de hidratación: el HTML del servidor queda con el error, el
  // del cliente no). `useRequestFetch()` es el mecanismo de Nuxt para esto:
  // en el servidor reenvía las cookies de la petición entrante; en el
  // cliente es el `$fetch` global de siempre.
  const requestFetch = useRequestFetch()

  const results = ref<DiscoveryResult[]>([])
  const loading = ref(false)
  const searched = ref(false)
  const error = ref('')

  async function search(mode: 'filters' | 'ai', queryText: string, filters: DiscoveryFilters) {
    loading.value = true
    error.value = ''
    try {
      const res = await requestFetch('/api/discover/search', {
        method: 'POST',
        body: { mode, queryText: queryText || undefined, filters }
      })
      results.value = res.results as DiscoveryResult[]
      searched.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se ha podido buscar. Inténtalo de nuevo.'
    } finally {
      loading.value = false
    }
  }

  return { results, loading, searched, error, search }
}

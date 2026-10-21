export interface DiscoveryResult {
  id: string
  name: string
  bio: string | null
  categories: string[]
  lookingFor: string | null
  minCents: number | null
  maxCents: number | null
  followers: number
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
  const results = ref<DiscoveryResult[]>([])
  const loading = ref(false)
  const searched = ref(false)
  const error = ref('')

  async function search(mode: 'filters' | 'ai', queryText: string, filters: DiscoveryFilters) {
    loading.value = true
    error.value = ''
    try {
      const res = await $fetch('/api/discover/search', {
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

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

interface DiscoverResponse {
  results: DiscoveryResult[]
  aiSummary: string | null
  aiCategories: string[]
}

/**
 * Cliente de `/api/discover/search`, compartido por `/creator/discover`
 * (busca partners) y `/partner/discover` (busca creadores) — la dirección
 * la decide el propio servidor según quién llama, no hace falta pasársela.
 *
 * En modo IA, la búsqueda se parte en dos peticiones en vez de una: el
 * modelo gratuito de OpenRouter "razona" antes de responder y tarda varios
 * segundos incluso con pocos candidatos (ver AI_CANDIDATE_CAP en
 * search.post.ts) — bloquear toda la pantalla hasta que termine se sentía
 * roto. Así que `results` se rellena al instante con el orden por filtros
 * (siempre rápido, solo base de datos), y `aiLoading`/`aiSummary` cuentan
 * aparte cómo va el enriquecimiento de IA, que llega después y resuelve
 * `results` otra vez, ya puntuado y reordenado — FeaturedDeck.vue anima la
 * aparición de esos puestos en vez de esperar a tenerlos todos de golpe.
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

  const aiLoading = ref(false)
  const aiSummary = ref<string | null>(null)
  const aiCategories = ref<string[]>([])

  async function runFetch(mode: 'filters' | 'ai', queryText: string, filters: DiscoveryFilters) {
    return requestFetch('/api/discover/search', {
      method: 'POST',
      body: { mode, queryText: queryText || undefined, filters }
    }) as Promise<DiscoverResponse>
  }

  async function search(mode: 'filters' | 'ai', queryText: string, filters: DiscoveryFilters) {
    loading.value = true
    error.value = ''
    aiSummary.value = null
    aiCategories.value = []

    try {
      // Siempre se lanza primero el modo filtros, aunque se haya pedido IA:
      // es la parte rápida (sin LLM de por medio), pinta algo de verdad al
      // instante en vez de dejar la pantalla en blanco mientras se piensa.
      const base = await runFetch('filters', queryText, filters)
      results.value = base.results
      searched.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se ha podido buscar. Inténtalo de nuevo.'
      loading.value = false
      return
    }
    loading.value = false

    if (mode !== 'ai' || !queryText.trim()) return

    aiLoading.value = true
    try {
      const enriched = await runFetch('ai', queryText, filters)
      results.value = enriched.results
      aiSummary.value = enriched.aiSummary
      aiCategories.value = enriched.aiCategories
    } catch (err) {
      console.error('[useDiscover] fallo al enriquecer con IA (se queda el orden por filtros):', err)
    } finally {
      aiLoading.value = false
    }
  }

  return { results, loading, searched, error, aiLoading, aiSummary, aiCategories, search }
}

import { errorMessage } from '~/utils/error-message'
export interface DiscoveryResult {
  id: string
  name: string
  bio: string | null
  categories: string[]
  lookingFor: string | null
  minCents: number | null
  maxCents: number | null
  coverUrl: string | null
  score: number
  reason: string | null
  profileId: string
  collabCount: number
  responseHours: number | null
  platforms: string[]
  verified: boolean
  collaborationTypes: string[]
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

  // Caché en memoria de la pestaña (hallazgo #6: "cachear consultas
  // repetidas") — si se repite exactamente la misma búsqueda de IA (texto +
  // filtros), no se vuelve a gastar una llamada real al proveedor. No
  // persiste entre sesiones ni páginas a propósito: es solo para evitar el
  // caso típico de volver a pulsar "Buscar con IA" sobre lo mismo. Acotada
  // a 20 entradas (se descarta la más antigua) para no crecer sin límite.
  const aiCache = new Map<string, DiscoverResponse>()
  function cacheKey(queryText: string, filters: DiscoveryFilters) {
    return JSON.stringify([queryText, filters])
  }

  // Petición de IA en curso, para poder cancelarla (hallazgo #6: "botón de
  // cancelar") — el modo "filters" nunca se cancela, siempre es rápido
  // (solo base de datos, sin proveedor externo de por medio).
  let aiAbort: AbortController | null = null

  async function runFetch(mode: 'filters' | 'ai', queryText: string, filters: DiscoveryFilters, signal?: AbortSignal) {
    return requestFetch('/api/discover/search', {
      method: 'POST',
      body: { mode, queryText: queryText || undefined, filters },
      signal
    }) as Promise<DiscoverResponse>
  }

  // Si el usuario relanza la búsqueda (cambia de modo, pulsa Buscar dos
  // veces) antes de que termine la anterior, esa respuesta vieja no debe
  // pisar los resultados de la más nueva al llegar tarde — cada llamada a
  // `search()` se numera y cualquier fase (filtros o IA) que termine
  // cuando ya no es la última lanzada se descarta en silencio, sin tocar
  // `results`/`loading`/`aiSummary`.
  let latestRequestId = 0

  async function search(mode: 'filters' | 'ai', queryText: string, filters: DiscoveryFilters) {
    const requestId = ++latestRequestId
    loading.value = true
    error.value = ''
    aiSummary.value = null
    aiCategories.value = []

    try {
      // Siempre se lanza primero el modo filtros, aunque se haya pedido IA:
      // es la parte rápida (sin LLM de por medio), pinta algo de verdad al
      // instante en vez de dejar la pantalla en blanco mientras se piensa.
      const base = await runFetch('filters', queryText, filters)
      if (requestId !== latestRequestId) return
      results.value = base.results
      searched.value = true
    } catch (err) {
      if (requestId !== latestRequestId) return
      error.value = errorMessage(err, 'No se ha podido buscar. Inténtalo de nuevo.')
      loading.value = false
      return
    }
    loading.value = false

    if (mode !== 'ai' || !queryText.trim()) return

    const key = cacheKey(queryText, filters)
    const cached = aiCache.get(key)
    if (cached) {
      results.value = cached.results
      aiSummary.value = cached.aiSummary
      aiCategories.value = cached.aiCategories
      return
    }

    aiLoading.value = true
    aiAbort = new AbortController()
    try {
      const enriched = await runFetch('ai', queryText, filters, aiAbort.signal)
      if (requestId !== latestRequestId) return
      results.value = enriched.results
      aiSummary.value = enriched.aiSummary
      aiCategories.value = enriched.aiCategories
      if (aiCache.size >= 20) aiCache.delete(aiCache.keys().next().value as string)
      aiCache.set(key, enriched)
    } catch (err) {
      const aborted = err instanceof Error && (err.name === 'AbortError' || /abort/i.test(err.message))
      if (!aborted) console.error('[useDiscover] fallo al enriquecer con IA (se queda el orden por filtros):', err)
    } finally {
      if (requestId === latestRequestId) aiLoading.value = false
      aiAbort = null
    }
  }

  // Cancela la petición de IA en curso (si hay una) — el orden por filtros
  // ya pintado se queda tal cual, no desaparece nada.
  function cancelAi() {
    aiAbort?.abort()
  }

  return { results, loading, searched, error, aiLoading, aiSummary, aiCategories, search, cancelAi }
}

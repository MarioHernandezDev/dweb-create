import type { TrendSuggestion } from '~/types'

/**
 * Ideas de contenido para el nicho del creador logueado, pedidas a
 * `/api/ml/trends` (ver ese archivo para lo que es real y lo que es
 * generado por LLM — nada aquí finge ser una tendencia detectada de verdad).
 */
export function useMyTrends() {
  const trends = useState<TrendSuggestion[]>('my-trends', () => [])
  const loading = useState<boolean>('my-trends-loading', () => false)
  const loaded = useState<boolean>('my-trends-loaded', () => false)

  async function refresh() {
    loading.value = true
    try {
      const { trends: data } = await $fetch<{ trends: TrendSuggestion[] }>('/api/ml/trends')
      trends.value = data
      loaded.value = true
    } catch (err) {
      console.error('[useMyTrends] fallo al cargar ideas de tendencia:', err)
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return trends.value
  }

  function reset() {
    trends.value = []
    loaded.value = false
  }

  return { trends, loading, loaded, refresh, ensureLoaded, reset }
}

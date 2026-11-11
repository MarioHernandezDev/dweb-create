import type { MetricsResult } from '~~/server/utils/collab-metrics'

/** Métricas propias del usuario (GET /api/analytics/me). El periodo se guarda en la URL (`?periodo=`). */
export function useCollabInsights() {
  const route = useRoute()
  const router = useRouter()
  const valid = ['3m', '6m', '12m', 'all']
  const range = ref<string>(valid.includes(String(route.query.periodo)) ? String(route.query.periodo) : '12m')
  const metrics = ref<MetricsResult | null>(null)
  const loading = ref(false)
  const error = ref('')
  const requestFetch = useRequestFetch()

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const res = await requestFetch<{ metrics: MetricsResult }>('/api/analytics/me', { query: { range: range.value } })
      metrics.value = res.metrics
    } catch (e) {
      error.value = (e as { data?: { message?: string } })?.data?.message ?? 'No se han podido cargar tus resultados.'
    } finally {
      loading.value = false
    }
  }

  function setRange(v: string) {
    if (!valid.includes(v) || v === range.value) return
    range.value = v
    router.replace({ query: { ...route.query, periodo: v } })
    load()
  }

  return { range, metrics, loading, error, load, setRange }
}

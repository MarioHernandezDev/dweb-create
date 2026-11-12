import { readClientErrorMessage, readSocialApiError } from '~/utils/social-api-error'
import type { MetricRow } from '~/utils/post-metrics-view'

/**
 * Métricas guardadas de una publicación vinculada (A-R8b). La LECTURA va directa
 * a la tabla `metrics` con la sesión del usuario (la RLS ya limita a su dueño y
 * al partner de la colaboración); la ACTUALIZACIÓN la hace el servidor
 * (`/api/social/post-metrics-refresh`), que lee al proveedor y guarda una fila
 * por día.
 */
export function usePostMetrics(postId: Ref<string> | string) {
  const client = useSupabaseClient()
  const id = computed(() => unref(postId))
  const rows = ref<MetricRow[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const refreshing = ref(false)
  const error = ref<{ code: string | null; message: string } | null>(null)
  /** El proveedor ya no devuelve el contenido vinculado (borrado o privado). */
  const contentMissing = ref(false)

  async function load() {
    loading.value = true
    // Las 60 mediciones más recientes (una por día): de sobra para la última y la anterior.
    const { data, error: err } = await client
      .from('metrics')
      .select('measured_on, source, views, likes, comments, shares, saves, reach, engagement_rate')
      .eq('post_id', id.value)
      .not('source', 'is', null)
      .order('measured_on', { ascending: false })
      .limit(60)
    if (err) {
      console.error('[usePostMetrics] fallo al cargar las métricas:', err.message)
      error.value = { code: null, message: 'No se han podido cargar las métricas.' }
    } else {
      rows.value = (data ?? []) as MetricRow[]
      loaded.value = true
    }
    loading.value = false
  }

  async function refresh() {
    refreshing.value = true
    error.value = null
    contentMissing.value = false
    try {
      const res = await $fetch<{ saved: number; contentMissing: boolean }>('/api/social/post-metrics-refresh', { method: 'POST', body: { postId: id.value }, timeout: 40_000 })
      contentMissing.value = res.contentMissing
      await load()
    } catch (err) {
      const { code, message } = readSocialApiError(err)
      error.value = { code, message: message ?? readClientErrorMessage(err) ?? 'No se han podido actualizar las métricas. Inténtalo de nuevo en unos minutos.' }
    } finally {
      refreshing.value = false
    }
  }

  return { rows, loading, loaded, refreshing, error, contentMissing, load, refresh }
}

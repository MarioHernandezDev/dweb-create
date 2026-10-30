import { buildCollaborationReport, type ReportLink, type ReportMetricRow, type ReportPost } from '~/utils/collaboration-report'

/**
 * Datos del informe de rendimiento de una colaboración (A-R15). Todo se lee
 * directo con la sesión del usuario: la autorización la aplica la RLS de
 * `posts`, `post_external_links` y `metrics` (un partner solo ve las entregas
 * de SUS colaboraciones; probado en tests/integration/post-links-and-metrics.spec.ts),
 * no un filtro del cliente. Aquí solo se pide por id de colaboración.
 */
export function useCollaborationReport(collaborationId: Ref<string> | string) {
  const client = useSupabaseClient()
  const id = computed(() => unref(collaborationId))
  const posts = ref<ReportPost[]>([])
  const links = ref<ReportLink[]>([])
  const metrics = ref<ReportMetricRow[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const { data: postRows, error: postErr } = await client
        .from('posts')
        .select('id, title, platform, status, due_date')
        .eq('collaboration_id', id.value)
        .order('due_date', { ascending: true })
      if (postErr) throw postErr
      posts.value = ((postRows ?? []) as { id: string; title: string; platform: string; status: string; due_date: string }[])
        .map((p) => ({ id: p.id, title: p.title, platform: p.platform, status: p.status, dueDate: p.due_date.slice(0, 10) }))

      const ids = posts.value.map((p) => p.id)
      if (!ids.length) {
        links.value = []
        metrics.value = []
      } else {
        const [linkRes, metricRes] = await Promise.all([
          client.from('post_external_links').select('post_id, external_url').in('post_id', ids),
          client
            .from('metrics')
            .select('post_id, measured_on, source, views, likes, comments, shares, saves, reach, engagement_rate')
            .in('post_id', ids)
            .not('source', 'is', null)
            .order('measured_on', { ascending: false })
            .limit(60 * ids.length)
        ])
        if (linkRes.error) throw linkRes.error
        if (metricRes.error) throw metricRes.error
        links.value = (linkRes.data ?? []) as ReportLink[]
        metrics.value = (metricRes.data ?? []) as ReportMetricRow[]
      }
      loaded.value = true
    } catch (err) {
      console.error('[useCollaborationReport] fallo al cargar el informe:', err instanceof Error ? err.message : err)
      error.value = 'No se ha podido cargar el informe de rendimiento.'
    } finally {
      loading.value = false
    }
  }

  const report = computed(() => buildCollaborationReport(posts.value, links.value, metrics.value))

  return { report, loading, loaded, error, load }
}

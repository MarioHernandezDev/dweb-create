import type { SnapshotRow } from '~/utils/account-history-view'

/**
 * Histórico propio de acumulados de una cuenta (A-R8a): lee
 * `social_account_snapshots` directamente con la sesión del usuario. La RLS solo
 * deja ver las cuentas del creador dueño y la tabla no admite escritura desde el
 * navegador (ver la migración M3), así que no hace falta un endpoint.
 * Solo se usa en el navegador, después de montar la página.
 */
export function useAccountSnapshots() {
  const client = useSupabaseClient()
  const rows = ref<SnapshotRow[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  async function load(accountId: string) {
    if (loading.value) return
    loading.value = true
    error.value = null
    // Los últimos 365 días de registros, del más reciente hacia atrás (tope de la gráfica).
    const { data, error: err } = await client
      .from('social_account_snapshots')
      .select('observed_on, followers_count, views_total, videos_count')
      .eq('social_account_id', accountId)
      .order('observed_on', { ascending: false })
      .limit(366)
    if (err) {
      console.error('[useAccountSnapshots] fallo al cargar el histórico:', err.message)
      error.value = 'No se ha podido cargar tu histórico. Inténtalo de nuevo en unos minutos.'
    } else {
      rows.value = (data ?? []) as SnapshotRow[]
      loaded.value = true
    }
    loading.value = false
  }

  return { rows, loading, loaded, error, load }
}

/**
 * Enlace privado para suscribirse al calendario de entregas (Google, Apple, Outlook). El token lo crea y lo renueva la base
 * (`get_or_create_calendar_feed` / `rotate_calendar_feed`); el servidor lo sirve en `/api/calendar/<token>.ics`.
 */
export function useCalendarFeed() {
  const client = useSupabaseClient()
  const token = useState<string | null>('calendar-feed-token', () => null)
  const loading = ref(false)
  const error = ref('')

  const url = computed(() => (token.value && import.meta.client ? `${window.location.origin}/api/calendar/${token.value}.ics` : ''))
  /** Mismo enlace con el esquema `webcal:`, que abre directamente la app de calendario del dispositivo. */
  const webcalUrl = computed(() => url.value.replace(/^https?:/, 'webcal:'))

  async function call(fn: 'get_or_create_calendar_feed' | 'rotate_calendar_feed') {
    loading.value = true
    error.value = ''
    try {
      const { data, error: rpcError } = await client.rpc(fn as never)
      if (rpcError) throw rpcError
      token.value = String(data)
      return true
    } catch (e) {
      console.error(`[useCalendarFeed] ${fn}:`, e)
      error.value = 'No se ha podido preparar el enlace del calendario. Inténtalo de nuevo.'
      return false
    } finally {
      loading.value = false
    }
  }

  const load = () => (token.value ? Promise.resolve(true) : call('get_or_create_calendar_feed'))
  const rotate = () => call('rotate_calendar_feed')

  return { token, url, webcalUrl, loading, error, load, rotate }
}

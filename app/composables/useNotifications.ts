export interface AppNotification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at
  }
}

/**
 * Bandeja de entrada del usuario (icono junto al perfil, en TopBar) — ver
 * migración 20261021110000_notifications.sql. Todo se escribe desde triggers
 * en la base de datos (login, alta, solicitudes de colaboración/plantilla);
 * este composable solo lee y marca como leído.
 */
export function useNotifications() {
  const client = useSupabaseClient()

  const notifications = useState<AppNotification[]>('my-notifications', () => [])
  const loaded = useState<boolean>('my-notifications-loaded', () => false)

  async function refresh() {
    const { data, error } = await client
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) {
      console.error('[useNotifications] fallo al cargar la bandeja:', error.message)
      return
    }
    notifications.value = (data as NotificationRow[]).map(mapRow)
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return notifications.value
  }

  const unreadCount = computed(() => notifications.value.filter((n) => !n.readAt).length)

  async function markRead(id: string) {
    const local = notifications.value.find((n) => n.id === id)
    if (local?.readAt) return

    const { error } = await client.from('notifications').update({ read_at: new Date().toISOString() } as never).eq('id', id)
    if (error) {
      console.error('[useNotifications] fallo al marcar como leída:', error.message)
      return
    }
    if (local) local.readAt = new Date().toISOString()
  }

  async function markAllRead() {
    const unreadIds = notifications.value.filter((n) => !n.readAt).map((n) => n.id)
    if (!unreadIds.length) return

    const now = new Date().toISOString()
    const { error } = await client.from('notifications').update({ read_at: now } as never).in('id', unreadIds)
    if (error) {
      console.error('[useNotifications] fallo al marcar todas como leídas:', error.message)
      return
    }
    for (const n of notifications.value) if (!n.readAt) n.readAt = now
  }

  function reset() {
    notifications.value = []
    loaded.value = false
  }

  return { notifications, loaded, unreadCount, refresh, ensureLoaded, markRead, markAllRead, reset }
}

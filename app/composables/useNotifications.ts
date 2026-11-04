import { ACTIVITY_NOTIFICATION_TYPES } from '~/utils/notifications'

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

const COLUMNS = 'id, type, title, body, link, read_at, created_at'

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
 *
 * Se cargan en dos consultas separadas, "importantes" y "actividad" (ver
 * utils/notifications.ts) — antes era una sola lista con `limit(30)`, y un
 * aluvión de inicios de sesión (p. ej. durante pruebas) podía desplazar
 * fuera de esos 30 cualquier solicitud u oferta real sin que se notara.
 * Separarlas en el origen garantiza que lo importante no se entierra,
 * pase lo que pase con el volumen de actividad.
 */
export function useNotifications() {
  const client = useSupabaseClient()

  const important = useState<AppNotification[]>('my-notifications-important', () => [])
  const activity = useState<AppNotification[]>('my-notifications-activity', () => [])
  const loaded = useState<boolean>('my-notifications-loaded', () => false)
  const refreshedAt = useState<number>('my-notifications-refreshed-at', () => 0)

  async function refresh() {
    refreshedAt.value = Date.now()
    const [{ data: importantRows, error: e1 }, { data: activityRows, error: e2 }] = await Promise.all([
      client.from('notifications').select(COLUMNS).not('type', 'in', `(${ACTIVITY_NOTIFICATION_TYPES.join(',')})`).order('created_at', { ascending: false }).limit(50),
      client.from('notifications').select(COLUMNS).in('type', ACTIVITY_NOTIFICATION_TYPES as unknown as string[]).order('created_at', { ascending: false }).limit(20)
    ])
    if (e1 || e2) {
      console.error('[useNotifications] fallo al cargar la bandeja:', (e1 ?? e2)?.message)
      return
    }
    important.value = (importantRows as NotificationRow[]).map(mapRow)
    activity.value = (activityRows as NotificationRow[]).map(mapRow)
    loaded.value = true
  }

  /**
   * Vuelve a cargar solo si los datos tienen más de `maxAgeMs`. La barra
   * superior se monta en cada pantalla, y antes cada navegación repetía las dos
   * consultas aunque se hubieran pedido un segundo antes.
   */
  async function refreshIfStale(maxAgeMs = 20_000) {
    if (loaded.value && Date.now() - refreshedAt.value < maxAgeMs) return
    await refresh()
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return important.value
  }

  // El contador del badge (TopBar/SideRail/BottomTabBar) solo cuenta lo
  // importante — un aluvión de inicios de sesión ya no infla el "9+" con
  // avisos que no piden ninguna acción.
  const unreadCount = computed(() => important.value.filter((n) => !n.readAt).length)

  function findLocal(id: string) {
    return important.value.find((n) => n.id === id) ?? activity.value.find((n) => n.id === id)
  }

  async function markRead(id: string) {
    const local = findLocal(id)
    if (local?.readAt) return

    const { error } = await client.from('notifications').update({ read_at: new Date().toISOString() } as never).eq('id', id)
    if (error) {
      console.error('[useNotifications] fallo al marcar como leída:', error.message)
      return
    }
    if (local) local.readAt = new Date().toISOString()
  }

  async function markAllRead() {
    const all = [...important.value, ...activity.value]
    const unreadIds = all.filter((n) => !n.readAt).map((n) => n.id)
    if (!unreadIds.length) return

    const now = new Date().toISOString()
    const { error } = await client.from('notifications').update({ read_at: now } as never).in('id', unreadIds)
    if (error) {
      console.error('[useNotifications] fallo al marcar todas como leídas:', error.message)
      return
    }
    for (const n of all) if (!n.readAt) n.readAt = now
  }

  function reset() {
    important.value = []
    activity.value = []
    loaded.value = false
  }

  return { important, activity, loaded, unreadCount, refresh, refreshIfStale, ensureLoaded, markRead, markAllRead, reset }
}

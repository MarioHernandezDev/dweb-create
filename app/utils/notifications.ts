/**
 * Clasificación de avisos — hallazgo #2 de la auditoría de usabilidad:
 * "Has iniciado sesión" se mezclaba con solicitudes/ofertas/valoraciones y
 * enterraba lo importante (el límite de 30 avisos de la bandeja podía
 * llenarse entero solo de inicios de sesión durante una sesión de pruebas
 * larga, dejando lo accionable fuera de la vista sin que nadie lo notara).
 *
 * "Actividad": ruido de cuenta, no pide ninguna acción (inicio de sesión,
 * bienvenida). Todo lo demás es "importante" — solicitudes, ofertas,
 * cambios pedidos, aprobaciones, valoraciones, pagos.
 */
/**
 * Texto de un aviso tal como se enseña. Algunos títulos los escribe la base de datos pensando en el cobro
 * («Colaboración lista para pagar»); con los cobros apagados (lanzamiento gratis) se enseñan sin hablar de pagar.
 */
const PAY_TITLE = 'Colaboración lista para pagar'
export function displayNoticeTitle(title: string, paymentsEnabled: boolean): string {
  return !paymentsEnabled && title === PAY_TITLE ? 'Oferta aceptada: ya es una colaboración' : title
}
export function displayNoticeBody(title: string, body: string | null, paymentsEnabled: boolean): string | null {
  return !paymentsEnabled && title === PAY_TITLE ? 'La oferta aceptada ya está en tus colaboraciones.' : body
}

export const ACTIVITY_NOTIFICATION_TYPES = ['login', 'welcome'] as const

/** Lo mínimo que necesita `groupNotifications` de un aviso (lo cumple `AppNotification`). */
interface GroupableNotification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationGroup<T extends GroupableNotification = GroupableNotification> = T & {
  /** Cuántos avisos iguales agrupa (1 = sin agrupar). */
  count: number
  /** Ids de todos los avisos del grupo, para marcarlos juntos como leídos. */
  ids: string[]
  /** Verdadero si alguno del grupo sigue sin leer. */
  unread: boolean
}

/**
 * M-N1 (hallazgo #2): agrupa avisos idénticos — mismo tipo, título, texto y
 * destino — en una sola fila con contador ("×3"), p. ej. varias solicitudes
 * repetidas de la misma persona o los inicios de sesión de una racha de
 * pruebas. Los leídos y los no leídos NO se mezclan: si hay un aviso nuevo
 * igual a otros ya leídos, se muestra aparte para que no quede escondido.
 *
 * Se agrupa en el cliente, sin tocar la base de datos. Conserva el orden de
 * entrada (más reciente primero): cada grupo toma el lugar y los datos de su
 * aviso más reciente.
 */
export function groupNotifications<T extends GroupableNotification>(list: T[]): NotificationGroup<T>[] {
  const groups = new Map<string, NotificationGroup<T>>()
  for (const n of list) {
    const key = [n.type, n.title, n.body ?? '', n.link ?? '', n.readAt ? 'read' : 'unread'].join('\u0000')
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      existing.ids.push(n.id)
    } else {
      groups.set(key, { ...n, count: 1, ids: [n.id], unread: !n.readAt })
    }
  }
  return [...groups.values()]
}

/**
 * Preferencias de avisos (tabla `notification_preferences`, migración 20261110100000). Solo se pueden silenciar
 * avisos que no piden ninguna acción; solicitudes, ofertas, revisiones y pagos llegan siempre. La misma lista de
 * tipos está en el CHECK de la tabla: si se añade un grupo aquí, hay que ampliarlo allí.
 */
export interface NotificationPreferenceGroup {
  id: string
  label: string
  description: string
  types: string[]
  /** A quién se le ofrece (por defecto, a los dos roles). */
  role?: 'creator' | 'partner'
}

export const NOTIFICATION_PREFERENCE_GROUPS: NotificationPreferenceGroup[] = [
  { id: 'reminders', label: 'Recordatorios de plazo', description: 'Solicitudes a punto de caducar y contenido que vence en menos de 48 horas.', types: ['collaboration_expiring', 'post_due_soon'] },
  { id: 'ratings', label: 'Valoraciones', description: 'Cuando la otra parte te valora al terminar una colaboración.', types: ['rating_received'] },
  { id: 'log', label: 'Notas del registro', description: 'Cuando la otra parte anota algo en el registro de una colaboración.', types: ['collaboration_incident_logged'] },
  { id: 'login', label: 'Inicios de sesión', description: 'Un aviso en Actividad cada vez que entras en tu cuenta.', types: ['login'] }
]

export const MUTABLE_NOTIFICATION_TYPES: string[] = NOTIFICATION_PREFERENCE_GROUPS.flatMap((g) => g.types)

/** Un grupo está activo si ninguno de sus tipos está silenciado. */
export function isGroupEnabled(group: NotificationPreferenceGroup, muted: readonly string[]): boolean {
  return !group.types.some((t) => muted.includes(t))
}

/** Lista de tipos silenciados tras activar o desactivar un grupo (sin duplicados ni tipos desconocidos). */
export function toggleGroup(group: NotificationPreferenceGroup, muted: readonly string[], enabled: boolean): string[] {
  const rest = muted.filter((t) => !group.types.includes(t) && MUTABLE_NOTIFICATION_TYPES.includes(t))
  return [...new Set(enabled ? rest : [...rest, ...group.types])]
}

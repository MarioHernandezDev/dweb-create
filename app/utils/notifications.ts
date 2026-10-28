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

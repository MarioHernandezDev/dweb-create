/** Textos y helpers compartidos por las pantallas del panel de admin. */
export type AdminRole = 'viewer' | 'moderator' | 'admin'

export const ROLE_LABELS: Record<AdminRole, string> = { viewer: 'Solo lectura', moderator: 'Moderación', admin: 'Administración' }
const RANK: Record<AdminRole, number> = { viewer: 0, moderator: 1, admin: 2 }
export const canDo = (role: AdminRole | null | undefined, min: AdminRole) => !!role && RANK[role] >= RANK[min]

export const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  unrealistic_budget: 'Presupuesto poco serio',
  inappropriate: 'Contenido inapropiado',
  other: 'Otro motivo',
  breach: 'Incumplimiento (colaboración terminada)'
}

export const REPORT_STATUS_LABELS: Record<string, string> = { open: 'Abierto', reviewing: 'En revisión', resolved: 'Resuelto', dismissed: 'Desestimado' }

export const COLLAB_STATUS_LABELS: Record<string, string> = {
  requested: 'Solicitada', accepted: 'Aceptada', in_progress: 'En curso', completed: 'Completada',
  declined: 'Rechazada', cancelled: 'Cancelada', terminated: 'Terminada por incumplimiento'
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  signup: 'Registros', collaboration_created: 'Colaboraciones nuevas', payment: 'Pagos', collaboration_cancelled: 'Cancelaciones',
  collaboration_terminated: 'Incumplimientos', pro_paid: 'Pro pagado', pro_gifted: 'Pro regalado', report_created: 'Reportes',
  deletion_requested: 'Solicitudes de eliminación', admin_action: 'Acciones del equipo'
}

export const ACTIVITY_ICONS: Record<string, string> = {
  signup: 'ph:user-plus-fill', collaboration_created: 'ph:handshake-fill', payment: 'ph:currency-eur-fill',
  collaboration_cancelled: 'ph:x-circle-fill', collaboration_terminated: 'ph:warning-octagon-fill',
  pro_paid: 'ph:sparkle-fill', pro_gifted: 'ph:gift-fill', report_created: 'ph:flag-fill',
  deletion_requested: 'ph:trash-fill', admin_action: 'ph:shield-check-fill'
}

/** Notas rápidas para cerrar reportes: rellenan la nota interna (mínimo 10 caracteres, que es lo que exige el servidor). */
export const QUICK_NOTES: { label: string; text: string }[] = [
  { label: 'Sin pruebas', text: 'Revisado: no hay pruebas suficientes para actuar. Se desestima.' },
  { label: 'Spam confirmado', text: 'Spam confirmado. Se avisa a la cuenta y se vigila si reincide.' },
  { label: 'Aviso a la cuenta', text: 'Se acredita el incumplimiento. Primer caso: aviso a la cuenta.' },
  { label: 'Bloqueo', text: 'Segundo caso acreditado contra la misma cuenta: se bloquea el acceso.' },
  { label: 'Resuelto entre partes', text: 'Las dos partes lo han resuelto entre ellas. Se cierra sin más acciones.' },
  { label: 'Duplicado', text: 'Duplicado de otro reporte ya tratado. Se cierra.' }
]

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** «3 días» de antigüedad, para ver de un vistazo qué lleva tiempo esperando. */
export function ageLabel(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (hours < 1) return 'menos de 1 h'
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}

export function errorText(e: unknown, fallback: string): string {
  const err = e as { data?: { message?: string; statusMessage?: string }; statusMessage?: string }
  return err?.data?.message ?? err?.data?.statusMessage ?? err?.statusMessage ?? fallback
}

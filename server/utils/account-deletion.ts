/**
 * Reglas de la eliminación de cuenta, separadas del endpoint para poder probarlas.
 *
 * - Con colaboraciones abiertas no se elimina: antes hay que cerrarlas o cancelarlas.
 * - Sin historial compartido, la cuenta se borra en el momento (y con ella, en cascada, sus datos).
 * - Con historial (colaboraciones terminadas), borrar en cascada se llevaría también los
 *   registros de la otra parte, así que queda como solicitud para que la revise el equipo.
 */
export const OPEN_COLLABORATION_STATUSES = ['requested', 'accepted', 'in_progress'] as const
export const HISTORY_COLLABORATION_STATUSES = ['completed', 'cancelled', 'terminated'] as const

export type DeletionPlan = 'blocked' | 'delete_now' | 'request'

export function planAccountDeletion(statuses: string[]): DeletionPlan {
  if (statuses.some((s) => (OPEN_COLLABORATION_STATUSES as readonly string[]).includes(s))) return 'blocked'
  if (statuses.some((s) => (HISTORY_COLLABORATION_STATUSES as readonly string[]).includes(s))) return 'request'
  return 'delete_now'
}

export function emailMatches(typed: unknown, actual: string | undefined | null): boolean {
  return typeof typed === 'string' && !!actual && typed.trim().toLowerCase() === actual.trim().toLowerCase()
}

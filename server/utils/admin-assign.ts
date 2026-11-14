import { UUID_RE } from './admin-query'

/**
 * Interpreta el campo `assignedTo` de una petición del admin:
 *  undefined → no tocar; null/'none' → quitar la asignación; 'me' → la persona que actúa; uuid → ese miembro.
 * Con la contraseña compartida no hay «yo» (no es una persona concreta), así que 'me' falla.
 */
export function resolveAssignee(value: unknown, actorMemberId: string | null): { ok: true; skip: boolean; value: string | null } | { ok: false; message: string } {
  if (value === undefined) return { ok: true, skip: true, value: null }
  if (value === null || value === 'none') return { ok: true, skip: false, value: null }
  if (value === 'me') {
    return actorMemberId ? { ok: true, skip: false, value: actorMemberId } : { ok: false, message: 'Con la contraseña compartida no se puede asignar a «mí». Entra con tu cuenta personal.' }
  }
  if (typeof value === 'string' && UUID_RE.test(value)) return { ok: true, skip: false, value }
  return { ok: false, message: 'Persona no válida.' }
}

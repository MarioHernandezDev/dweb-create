import { emailMatches, planAccountDeletion } from './account-deletion'

export type RemovalMode = 'delete' | 'anonymize'

export type RemovalDecision =
  | { ok: true }
  | { ok: false; code: 'bad_mode' | 'email_mismatch' | 'blocked' | 'needs_acknowledge'; message: string }

/**
 * Reglas del borrado de una cuenta por parte del equipo (docs/14-OPERACIONES-ADMIN.md, §2):
 *  - hay que escribir el correo de la cuenta;
 *  - con colaboraciones abiertas no se toca (se cierran antes);
 *  - borrar del todo una cuenta con historial compartido se lleva por delante los registros de la otra parte,
 *    así que exige reconocerlo expresamente; anonimizar no (conserva el registro, quita los datos personales).
 */
export function decideRemoval(input: { mode: unknown; confirmEmail: unknown; accountEmail: string | null | undefined; statuses: string[]; acknowledgeSharedHistory: unknown }): RemovalDecision {
  if (input.mode !== 'delete' && input.mode !== 'anonymize') return { ok: false, code: 'bad_mode', message: 'Elige si borrar la cuenta del todo o anonimizarla.' }
  if (!emailMatches(input.confirmEmail, input.accountEmail)) return { ok: false, code: 'email_mismatch', message: 'El correo escrito no coincide con el de la cuenta.' }
  const plan = planAccountDeletion(input.statuses)
  if (plan === 'blocked') return { ok: false, code: 'blocked', message: 'Tiene colaboraciones abiertas. Ciérralas o cancélalas antes de eliminar la cuenta.' }
  if (input.mode === 'delete' && plan === 'request' && input.acknowledgeSharedHistory !== true) {
    return { ok: false, code: 'needs_acknowledge', message: 'Esta cuenta tiene colaboraciones terminadas con otras personas. Borrarla del todo elimina también esos registros y los chats de la otra parte. Confirma que lo sabes o elige anonimizar.' }
  }
  return { ok: true }
}

/** Correo ficticio e imposible de entregar con el que queda una cuenta anonimizada. */
export function anonymizedEmail(profileId: string): string {
  return `eliminada-${profileId}@anon.invalid`
}

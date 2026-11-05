/**
 * Caducidad de una propuesta. Una solicitud nueva (`requested`) caduca a los 7 días (lo fija un trigger en la base de
 * datos, `collaborations_set_expiry`); las anteriores a esa migración no tienen fecha y nunca caducan. «Caducada» no es
 * un estado nuevo: es `requested` con `expires_at` en el pasado, y la base de datos impide aceptarla.
 */
export const PROPOSAL_VALID_DAYS = 7

export interface ExpiryState {
  expired: boolean
  /** «Caduca en 3 días», «Caduca hoy», «Caducada»; null si no aplica. */
  label: string | null
}

export function expiryState(status: string, expiresAt: string | null | undefined, now = Date.now()): ExpiryState {
  if (status !== 'requested' || !expiresAt) return { expired: false, label: null }
  const ms = Date.parse(expiresAt) - now
  if (ms <= 0) return { expired: true, label: 'Caducada' }
  const days = Math.ceil(ms / 86_400_000)
  if (ms < 86_400_000 && new Date(now).getDate() === new Date(expiresAt).getDate()) return { expired: false, label: 'Caduca hoy' }
  return { expired: false, label: `Caduca en ${days} ${days === 1 ? 'día' : 'días'}` }
}

import type { SocialAccount } from '~/types'
import { isComingSoonPlatform } from './mock-data'

/**
 * Estado de las redes en el perfil (A-R18b). Regla: solo se muestra como
 * "conectada" (check verde) una red cuyo estado guardado es `connected`;
 * una con token pero caducado, revocado o sin permiso se rotula con su causa,
 * y una sin conexión no es verificada nunca.
 */
export type SocialChipTone = 'ok' | 'attention' | 'off'

export interface SocialChip {
  platform: SocialAccount['platform']
  handle: string
  tone: SocialChipTone
  /** Texto corto de estado para mostrar junto al nombre de la red. */
  statusText: string
}

export function socialChipFor(a: SocialAccount): SocialChip {
  if (!a.connected) return { platform: a.platform, handle: '', tone: 'off', statusText: 'Sin conectar' }
  switch (a.status) {
    case 'connected': return { platform: a.platform, handle: a.handle, tone: 'ok', statusText: 'Conectada' }
    case 'missing_permissions': return { platform: a.platform, handle: a.handle, tone: 'attention', statusText: 'Falta un permiso' }
    case 'expired': return { platform: a.platform, handle: a.handle, tone: 'attention', statusText: 'Acceso caducado' }
    case 'revoked': return { platform: a.platform, handle: a.handle, tone: 'attention', statusText: 'Acceso revocado' }
    // Con token pero sin estado guardado: no se afirma que esté verificada.
    default: return { platform: a.platform, handle: a.handle, tone: 'attention', statusText: 'Estado sin comprobar' }
  }
}

/** Las redes con conexión real posible (las "próximamente" no cuentan), con su estado. */
export function socialChips(accounts: SocialAccount[]): SocialChip[] {
  return accounts.filter((a) => !isComingSoonPlatform(a.platform)).map(socialChipFor)
}

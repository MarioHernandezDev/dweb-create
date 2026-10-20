import type { Role } from '~/types'

export interface NavItem {
  to: string
  label: string
  icon: string
}

export const roleMeta: Record<Role, { label: string; description: string; home: string; icon: string }> = {
  creator: {
    label: 'Creador de contenido',
    description: 'Gestionas tu calendario, tus redes y tus datos.',
    home: '/creator',
    icon: 'ph:sparkle-fill'
  },
  partner: {
    label: 'Partner',
    description: 'Contactas a un creador de contenido y apruebas el contenido.',
    home: '/partner',
    icon: 'ph:user-circle-fill'
  }
}

export const roleNav: Record<Role, NavItem[]> = {
  creator: [
    { to: '/creator', label: 'Hoy', icon: 'ph:house-fill' },
    { to: '/creator/timeline', label: 'Tablero', icon: 'ph:kanban-fill' },
    { to: '/creator/requests', label: 'Solicitudes', icon: 'ph:handshake-fill' },
    { to: '/creator/socials', label: 'Redes', icon: 'ph:share-network-fill' },
    { to: '/creator/trends', label: 'Tendencias', icon: 'ph:flame-fill' },
    { to: '/creator/metrics', label: 'Métricas', icon: 'ph:chart-line-up-fill' }
  ],
  partner: [
    { to: '/partner', label: 'Calendario', icon: 'ph:calendar-check-fill' },
    { to: '/partner/discover', label: 'Descubrir', icon: 'ph:compass-fill' },
    { to: '/partner/requests', label: 'Solicitudes', icon: 'ph:handshake-fill' }
  ]
}

export function roleFromPath(path: string): Role {
  return path.startsWith('/partner') ? 'partner' : 'creator'
}

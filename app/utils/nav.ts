import type { Role } from '~/types'

export interface NavItem {
  to: string
  label: string
  icon: string
}

export const roleMeta: Record<Role, { label: string; description: string; home: string; icon: string }> = {
  manager: {
    label: 'Manager',
    description: 'Representas a varios influencers y repartes su trabajo.',
    home: '/manager',
    icon: 'ph:briefcase-fill'
  },
  creator: {
    label: 'Influencer',
    description: 'Gestionas tu calendario, tus redes y tus datos — solo o con manager.',
    home: '/creator',
    icon: 'ph:sparkle-fill'
  },
  client: {
    label: 'Cliente (marca)',
    description: 'Contactas a un influencer o a su manager, y apruebas el contenido.',
    home: '/client',
    icon: 'ph:user-circle-fill'
  }
}

export const roleNav: Record<Role, NavItem[]> = {
  manager: [
    { to: '/manager', label: 'Resumen', icon: 'ph:squares-four-fill' },
    { to: '/manager/timeline', label: 'Tablero', icon: 'ph:kanban-fill' },
    { to: '/manager/metrics', label: 'Métricas', icon: 'ph:chart-line-up-fill' }
  ],
  creator: [
    { to: '/creator', label: 'Hoy', icon: 'ph:house-fill' },
    { to: '/creator/timeline', label: 'Tablero', icon: 'ph:kanban-fill' },
    { to: '/creator/socials', label: 'Redes', icon: 'ph:share-network-fill' },
    { to: '/creator/trends', label: 'Tendencias', icon: 'ph:flame-fill' },
    { to: '/creator/metrics', label: 'Métricas', icon: 'ph:chart-line-up-fill' }
  ],
  client: [
    { to: '/client', label: 'Calendario', icon: 'ph:calendar-check-fill' },
    { to: '/client/discover', label: 'Descubrir', icon: 'ph:compass-fill' }
  ]
}

export function roleFromPath(path: string): Role {
  if (path.startsWith('/creator')) return 'creator'
  if (path.startsWith('/client')) return 'client'
  return 'manager'
}

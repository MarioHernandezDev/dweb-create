import type { Role } from '~/types'

export interface NavItem {
  to: string
  label: string
  icon: string
}

export const roleMeta: Record<Role, { label: string; description: string; home: string; icon: string }> = {
  manager: {
    label: 'Community manager',
    description: 'Llevas las entregas y métricas de varios clientes.',
    home: '/manager',
    icon: 'ph:briefcase-fill'
  },
  creator: {
    label: 'Creador de contenido',
    description: 'Gestionas tu propio calendario, tus redes y tus datos.',
    home: '/creator',
    icon: 'ph:sparkle-fill'
  },
  client: {
    label: 'Cliente',
    description: 'Revisas y apruebas el contenido de tu agencia.',
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
    { to: '/client', label: 'Calendario', icon: 'ph:calendar-check-fill' }
  ]
}

export function roleFromPath(path: string): Role {
  if (path.startsWith('/creator')) return 'creator'
  if (path.startsWith('/client')) return 'client'
  return 'manager'
}

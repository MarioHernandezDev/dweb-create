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

// Fase 1 de la reorganización de navegación (auditoría de usabilidad,
// 2026-10-23): "Solicitudes" → "Colaboraciones" en los dos roles (mismo
// nombre que ya se usaba en la pestaña de Ajustes del partner, que es la
// entidad real que gestiona esta sección) y "Calendario" → "Inicio" para el
// partner (esa página ya es un dashboard completo — estadísticas, sugerencias
// y el panel "Tu calendario" — no solo un calendario; el nombre de la
// sección interna, "Tu calendario", no cambia). Ningún `to` cambia de ruta.
export const roleNav: Record<Role, NavItem[]> = {
  creator: [
    { to: '/creator', label: 'Hoy', icon: 'ph:house-fill' },
    { to: '/creator/timeline', label: 'Tablero', icon: 'ph:kanban-fill' },
    { to: '/creator/discover', label: 'Descubrir', icon: 'ph:compass-fill' },
    { to: '/creator/requests', label: 'Colaboraciones', icon: 'ph:handshake-fill' },
    { to: '/creator/socials', label: 'Redes', icon: 'ph:share-network-fill' },
    { to: '/creator/metrics', label: 'Métricas', icon: 'ph:chart-line-up-fill' }
  ],
  partner: [
    { to: '/partner', label: 'Inicio', icon: 'ph:house-fill' },
    { to: '/partner/discover', label: 'Descubrir', icon: 'ph:compass-fill' },
    { to: '/partner/requests', label: 'Colaboraciones', icon: 'ph:handshake-fill' }
  ]
}

// Destinos reales con peso propio que hasta ahora solo existían como un
// icono sin texto en TopBar.vue (Chat/Bandeja), o sin ningún acceso desde el
// menú en absoluto (Guardados, solo alcanzable desde un link suelto en
// Descubrir) — mismo diagnóstico de la auditoría (sección 2.2). "Ajustes"
// apunta al perfil de cada rol; en SideRail.vue ya existe un bloque propio
// con el nombre de la cuenta que cumple esa función, así que ese componente
// solo usa los 3 primeros.
export function secondaryNav(role: Role): NavItem[] {
  return [
    { to: '/chat', label: 'Chat', icon: 'ph:chat-circle-fill' },
    { to: '/inbox', label: 'Bandeja de entrada', icon: 'ph:tray-fill' },
    { to: '/favorites', label: 'Guardados', icon: 'ph:bookmark-simple-fill' },
    { to: `/${role}/profile`, label: 'Ajustes', icon: 'ph:gear-six-fill' }
  ]
}

export function roleFromPath(path: string): Role {
  return path.startsWith('/partner') ? 'partner' : 'creator'
}

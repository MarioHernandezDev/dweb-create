import type { Role } from '~/types'

export interface NavItem {
  to: string
  label: string
  icon: string
  /** Funcionalidad prevista, aún sin construir: se enseña con la etiqueta «Pronto». */
  soon?: boolean
}

export const roleMeta: Record<Role, { label: string; description: string; home: string; icon: string }> = {
  creator: {
    label: 'Creador de contenido',
    description: 'Gestionas tus publicaciones, tus colaboraciones y tus resultados.',
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
    { to: '/creator', label: 'Inicio', icon: 'ph:house-fill' },
    { to: '/creator/timeline', label: 'Publicaciones', icon: 'ph:kanban-fill' },
    { to: '/creator/discover', label: 'Descubrir', icon: 'ph:compass-fill' },
    { to: '/creator/packages', label: 'Paquetes', icon: 'ph:package-fill' },
    { to: '/creator/library', label: 'Biblioteca', icon: 'ph:images-fill' },
    { to: '/creator/requests', label: 'Colaboraciones', icon: 'ph:handshake-fill' },
    { to: '/creator/insights', label: 'Resultados', icon: 'ph:chart-bar-fill' },
    { to: '/creator/metrics', label: 'Métricas', icon: 'ph:chart-line-up-fill', soon: true }
  ],
  partner: [
    { to: '/partner', label: 'Inicio', icon: 'ph:house-fill' },
    { to: '/partner/discover', label: 'Descubrir', icon: 'ph:compass-fill' },
    { to: '/partner/requests', label: 'Colaboraciones', icon: 'ph:handshake-fill' },
    { to: '/partner/packages', label: 'Necesidades', icon: 'ph:package-fill' },
    { to: '/partner/insights', label: 'Resultados', icon: 'ph:chart-bar-fill' }
  ]
}

// Destinos reales con peso propio que hasta ahora solo existían como un
// icono sin texto en TopBar.vue (Chat/Bandeja), o sin ningún acceso desde el
// menú en absoluto (Guardados, solo alcanzable desde un link suelto en
// Descubrir) — mismo diagnóstico de la auditoría (sección 2.2). En SideRail.
// vue ya existe un bloque propio con el nombre de la cuenta que cumple esa
// función, así que ese componente solo usa los 3 primeros.
//
// Antes se llamaba "Ajustes" aquí mientras el avatar de TopBar.vue lo
// enlazaba como "Tu perfil" — misma ruta, dos nombres (hallazgo #5 de la
// auditoría de usabilidad). Un solo nombre para los dos: "Perfil", porque
// la primera pestaña de esa página es la ficha pública, no una lista de
// interruptores.
export function secondaryNav(role: Role): NavItem[] {
  return [
    { to: '/chat', label: 'Chat', icon: 'ph:chat-circle-fill' },
    { to: '/inbox', label: 'Bandeja de entrada', icon: 'ph:tray-fill' },
    { to: '/favorites', label: 'Guardados', icon: 'ph:bookmark-simple-fill' },
    { to: `/${role}/profile`, label: 'Perfil', icon: 'ph:user-circle-fill' }
  ]
}

export function roleFromPath(path: string): Role {
  return path.startsWith('/partner') ? 'partner' : 'creator'
}

import type { CollaborationStatus, ContentType, Post, PostStatus } from '~/types'

// El icono de cada estado vive en StatusGlyph.vue (set propio, no icon-font).
/** Explicación de una línea por fase — para el icono "?" de cada columna del Tablero, que antes no explicaba nada más que el nombre. */
export const phaseDescription: Record<PostStatus, string> = {
  idea: 'Solo una idea anotada — todavía no has empezado a producirla.',
  in_production: 'La estás grabando, editando o preparando.',
  ready_for_review: 'Lista por tu parte. Si es de una colaboración, el partner la aprueba o pide cambios aquí.',
  scheduled: 'Ya aprobada (o sin colaboración de por medio) — lista para publicarse.',
  published: 'Ya ha salido de verdad en la red social.',
  overdue: 'Fuera de plazo.'
}

export const statusMeta: Record<PostStatus, { label: string; color: string }> = {
  idea: { label: 'Idea', color: 'var(--color-status-idea)' },
  in_production: { label: 'En producción', color: 'var(--color-status-production)' },
  ready_for_review: { label: 'Para revisar', color: 'var(--color-status-review)' },
  scheduled: { label: 'Programado', color: 'var(--color-status-scheduled)' },
  published: { label: 'Publicado', color: 'var(--color-status-published)' },
  overdue: { label: 'Fuera de plazo', color: 'var(--color-status-alert)' }
}

export const collaborationStatusMeta: Record<CollaborationStatus, { label: string; color: string }> = {
  requested: { label: 'Pendiente de respuesta', color: 'var(--color-status-review)' },
  accepted: { label: 'Aceptada', color: 'var(--color-status-scheduled)' },
  in_progress: { label: 'En curso', color: 'var(--color-status-production)' },
  completed: { label: 'Completada', color: 'var(--color-status-published)' },
  declined: { label: 'Rechazada', color: 'var(--color-status-alert)' },
  cancelled: { label: 'Cancelada', color: 'var(--color-status-alert)' },
  terminated: { label: 'Terminada por incumplimiento', color: 'var(--color-status-alert)' }
}

/**
 * Única definición de "colaboración activa" y "solicitud sin resolver" —
 * antes `creator/index.vue` y `partner/index.vue` repetían cada uno su
 * propio filtro inline. Mismo texto, dos sitios: funcionaba igual mientras
 * no se tocara uno sin el otro, pero no había nada que lo garantizara (ver
 * hallazgo #1 de la auditoría de usabilidad). Ahora `useCollabRequests` y
 * `useMyCollaborations` llaman a esto, así que no pueden divergir.
 */
export function isActiveCollaborationStatus(status: CollaborationStatus): boolean {
  return status === 'accepted' || status === 'in_progress'
}

export function isUnresolvedCollaborationStatus(status: CollaborationStatus): boolean {
  return status === 'requested'
}

/**
 * Si una publicación está fuera de plazo de verdad. `overdue` existe como
 * valor del enum `post_status` en la base de datos, pero ningún código lo
 * asigna jamás — ni `updatePost` ni ninguna RPC lo escriben, así que una
 * publicación atrasada se queda con el estado que ya tenía (p. ej.
 * "in_production") para siempre. Esto es lo único que de verdad define
 * "atrasada": fecha de entrega ya pasada y todavía no publicada. Antes esta
 * misma cuenta vivía duplicada e inconsistente: `PhaseBoard.vue` la
 * calculaba así para el borde rojo de la card, pero `creator/index.vue`
 * comprobaba `status === 'overdue'` (que nunca es cierto) para decidir si
 * mostraba el aviso "Fuera de plazo" — esa tarjeta de alerta no podía
 * aparecer jamás. Una sola función, usada en los dos sitios.
 */
export function isPostOverdue(post: Pick<Post, 'dueInDays' | 'status'>): boolean {
  return post.dueInDays < 0 && post.status !== 'published'
}

export function overdueLabel(dueInDays: number): string {
  const days = Math.abs(dueInDays)
  return `Atrasada ${days} día${days === 1 ? '' : 's'}`
}

/**
 * ¿El servidor ha rechazado el cambio porque la publicación (de una colaboración
 * activa) necesita la aprobación de la marca? Desde la Fase 2 ya no se puede pasar a
 * «Programado» o «Publicado» sin ella (trigger `posts_review_guard`, que vale también
 * para service_role): antes solo se avisaba con una confirmación y se dejaba pasar.
 * Las pantallas lo usan para ofrecer «Enviar a revisión» en vez de un error genérico.
 */
export function isApprovalRequiredError(err: unknown): boolean {
  const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : ''
  return /necesita la aprobación de la marca/i.test(message)
}

/**
 * "Qué hacer ahora" en lenguaje llano, para el creador — nada de esto es
 * nuevo (la fase ya lo dice todo), pero antes había que inferirlo del
 * nombre de la fase sin ninguna frase que lo dijera de verdad. No depende
 * del estado real de la colaboración (solo de si está ligada o no): para
 * una pista de un vistazo no hace falta distinguir "aceptada" de "en
 * curso", y así no obliga a cargar las colaboraciones en todos los sitios
 * donde se edita una publicación.
 */
export function creatorNextStepHint(post: Pick<Post, 'status' | 'collaborationId'>, hasPendingChangeRequest: boolean): string {
  switch (post.status) {
    case 'idea':
      return post.collaborationId
        ? 'Empieza a producirla cuando quieras — todavía no la ve el partner.'
        : 'Es contenido propio: solo tú la ves. Empieza a producirla cuando quieras.'
    case 'in_production':
      if (hasPendingChangeRequest) return 'Hay cambios pedidos — resuélvelos antes de volver a mandarla a revisión.'
      return post.collaborationId
        ? 'Cuando esté lista, muévela a "Para revisar" para que el partner la vea y la apruebe.'
        : 'Cuando esté lista, muévela a "Programado".'
    case 'ready_for_review':
      return post.collaborationId
        ? 'A la espera de que el partner la apruebe o pida cambios — no necesitas hacer nada más por ahora.'
        : 'Puedes programarla cuando quieras.'
    case 'scheduled':
      return 'Lista — muévela a "Publicado" en cuanto salga de verdad.'
    default:
      return 'Ya está publicada.'
  }
}

/** Lo mismo que `creatorNextStepHint`, pero visto desde el partner — solo tiene sentido para una publicación ligada a su colaboración. */
export function partnerNextStepHint(status: PostStatus): string {
  switch (status) {
    case 'idea':
      return 'El creador todavía no ha empezado a producirla.'
    case 'in_production':
      return 'El creador la está preparando — te avisaremos cuando esté lista para revisar.'
    case 'ready_for_review':
      return 'Lista para que la apruebes o le pidas cambios.'
    case 'scheduled':
      return 'Ya aprobada — en camino a publicarse.'
    default:
      return 'Ya está publicada.'
  }
}

export const contentTypeMeta: Record<ContentType, { label: string; icon: string }> = {
  video: { label: 'Vídeo', icon: 'ph:play-circle-fill' },
  reel: { label: 'Reel', icon: 'ph:film-slate-fill' },
  carousel: { label: 'Carrusel', icon: 'ph:squares-four-fill' },
  image: { label: 'Imagen', icon: 'ph:image-fill' },
  story: { label: 'Story', icon: 'ph:circle-dashed' }
}

export function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.round(hours / 24)} d`
}

/** Separador de fecha en un hilo de chat — "Hoy"/"Ayer"/fecha completa. */
export function dateDividerLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })
}

export function dueLabel(dueInDays: number): string {
  if (dueInDays < -1) return `Hace ${Math.abs(dueInDays)} días`
  if (dueInDays === -1) return 'Ayer'
  if (dueInDays === 0) return 'Hoy'
  if (dueInDays === 1) return 'Mañana'
  if (dueInDays <= 6) return `En ${dueInDays} días`
  return `En ${Math.round(dueInDays / 7)} semana${dueInDays >= 14 ? 's' : ''}`
}

import type { CollaborationStatus, ContentType, PostStatus } from '~/types'

// El icono de cada estado vive en StatusGlyph.vue (set propio, no icon-font).
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
  declined: { label: 'Rechazada', color: 'var(--color-status-alert)' }
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

export function dueLabel(dueInDays: number): string {
  if (dueInDays < -1) return `Hace ${Math.abs(dueInDays)} días`
  if (dueInDays === -1) return 'Ayer'
  if (dueInDays === 0) return 'Hoy'
  if (dueInDays === 1) return 'Mañana'
  if (dueInDays <= 6) return `En ${dueInDays} días`
  return `En ${Math.round(dueInDays / 7)} semana${dueInDays >= 14 ? 's' : ''}`
}

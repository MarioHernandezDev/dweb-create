import type { ContentType, PostStatus } from '~/types'

export const statusMeta: Record<PostStatus, { label: string; color: string; icon: string }> = {
  idea: { label: 'Idea', color: 'var(--color-status-idea)', icon: 'ph:lightbulb-fill' },
  in_production: { label: 'En producción', color: 'var(--color-status-production)', icon: 'ph:camera-fill' },
  ready_for_review: { label: 'Para revisar', color: 'var(--color-status-review)', icon: 'ph:eye-fill' },
  scheduled: { label: 'Programado', color: 'var(--color-status-scheduled)', icon: 'ph:clock-fill' },
  published: { label: 'Publicado', color: 'var(--color-status-published)', icon: 'ph:check-circle-fill' },
  overdue: { label: 'Fuera de plazo', color: 'var(--color-status-alert)', icon: 'ph:warning-fill' }
}

export const contentTypeMeta: Record<ContentType, { label: string; icon: string }> = {
  video: { label: 'Vídeo', icon: 'ph:play-circle-fill' },
  reel: { label: 'Reel', icon: 'ph:film-slate-fill' },
  carousel: { label: 'Carrusel', icon: 'ph:squares-four-fill' },
  image: { label: 'Imagen', icon: 'ph:image-fill' },
  story: { label: 'Story', icon: 'ph:circle-dashed' }
}

export function dueLabel(dueInDays: number): string {
  if (dueInDays < -1) return `Hace ${Math.abs(dueInDays)} días`
  if (dueInDays === -1) return 'Ayer'
  if (dueInDays === 0) return 'Hoy'
  if (dueInDays === 1) return 'Mañana'
  if (dueInDays <= 6) return `En ${dueInDays} días`
  return `En ${Math.round(dueInDays / 7)} semana${dueInDays >= 14 ? 's' : ''}`
}

import type {
  MetricSummary,
  Platform,
  SparklinePoint,
  Suggestion
} from '~/types'

export const metricsByPlatform: MetricSummary[] = [
  { platform: 'tiktok', views: 512_900, likes: 48_760, comments: 3_410, shares: 5_220, deltaPct: 24.1 },
  { platform: 'youtube', views: 68_200, likes: 4_120, comments: 540, shares: 210, deltaPct: -3.6 },
  { platform: 'x', views: 31_500, likes: 1_890, comments: 320, shares: 410, deltaPct: 5.2 },
  { platform: 'instagram', views: 284_300, likes: 21_540, comments: 1_280, shares: 960, deltaPct: 12.4 }
]

export const engagementSeries: SparklinePoint[] = [
  { label: 'L', value: 42 },
  { label: 'M', value: 58 },
  { label: 'X', value: 51 },
  { label: 'J', value: 67 },
  { label: 'V', value: 74 },
  { label: 'S', value: 63 },
  { label: 'D', value: 81 }
]

export const suggestionsForDraft: Suggestion[] = [
  { kind: 'caption', text: 'Abre con una pregunta directa: "¿Cuántas apps crees que necesitas para ser productivo?"' },
  { kind: 'caption', text: 'Cierra con una invitación clara a guardar el post, no solo a comentar.' },
  { kind: 'hashtag', text: 'Añade #rutinamatutina, tiene un 18% más de alcance esta semana en tu nicho.' },
  { kind: 'schedule', text: 'Publica el jueves entre 18:00 y 20:00: es tu franja de mayor engagement histórico.' }
]

export const platformMeta: Record<Platform, { label: string; icon: string; colorVar: string }> = {
  tiktok: { label: 'TikTok', icon: 'ph:tiktok-logo-fill', colorVar: 'var(--color-platform-tiktok)' },
  youtube: { label: 'YouTube', icon: 'ph:youtube-logo-fill', colorVar: 'var(--color-platform-youtube)' },
  x: { label: 'X', icon: 'ph:x-logo-fill', colorVar: 'var(--color-platform-x)' },
  instagram: { label: 'Instagram', icon: 'ph:instagram-logo-fill', colorVar: 'var(--color-platform-instagram)' },
  facebook: { label: 'Facebook', icon: 'ph:facebook-logo-fill', colorVar: 'var(--color-platform-facebook)' },
  linkedin: { label: 'LinkedIn', icon: 'ph:linkedin-logo-fill', colorVar: 'var(--color-platform-linkedin)' }
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatEuros(cents: number | null): string {
  if (!cents) return 'Sin presupuesto'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100)
}

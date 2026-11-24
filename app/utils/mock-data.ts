import type {
  Platform,
  SocialAccount,
  SparklinePoint,
  Suggestion
} from '~/types'
import { formatMoney } from './money'

export const engagementSeries: SparklinePoint[] = [
  { label: 'L', value: 42 },
  { label: 'M', value: 58 },
  { label: 'X', value: 51 },
  { label: 'J', value: 67 },
  { label: 'V', value: 74 },
  { label: 'S', value: 63 },
  { label: 'D', value: 81 }
]

// Consejos GENÉRICOS, sin ninguna cifra ni dato inventado — se usan solo
// cuando la IA opcional (ver docs/8-AI-SUGGESTIONS-SETUP.md) no está
// configurada o falló, así que no hay sugerencias de verdad para ESTE post.
// Antes incluían estadísticas concretas fabricadas ("18% más de alcance en
// tu nicho", "tu franja de mayor engagement histórico") que parecían datos
// reales sin serlo — SuccessScoreCard.vue las marca además como "Consejos
// generales" para que quede claro que no son un análisis de esta publicación.
export const suggestionsForDraft: Suggestion[] = [
  { kind: 'caption', text: 'Abre con una pregunta directa para generar curiosidad desde la primera línea.' },
  { kind: 'caption', text: 'Cierra con una invitación clara a guardar o compartir el post, no solo a comentar.' },
  { kind: 'hashtag', text: 'Combina 2-3 hashtags de nicho con 1-2 más genéricos — ayuda al descubrimiento sin perder relevancia.' },
  { kind: 'schedule', text: 'Publica en la franja horaria donde suele estar más activa tu audiencia habitual.' }
]

// Orden fijo (ver main.css, "Paleta categórica validada") — nunca
// reordenar: define cómo se listan las redes en Redes/Métricas y en qué
// orden se comparan entre sí. `useMySocialAccounts.merge()` depende de este
// mismo orden (`Object.keys(platformMeta)`) para que las 6 salgan siempre
// igual, conectadas o no.
export const platformMeta: Record<Platform, { label: string; icon: string; colorVar: string }> = {
  tiktok: { label: 'TikTok', icon: 'ph:tiktok-logo-fill', colorVar: 'var(--color-platform-tiktok)' },
  youtube: { label: 'YouTube', icon: 'ph:youtube-logo-fill', colorVar: 'var(--color-platform-youtube)' },
  x: { label: 'X', icon: 'ph:x-logo-fill', colorVar: 'var(--color-platform-x)' },
  instagram: { label: 'Instagram', icon: 'ph:instagram-logo-fill', colorVar: 'var(--color-platform-instagram)' },
  facebook: { label: 'Facebook', icon: 'ph:facebook-logo-fill', colorVar: 'var(--color-platform-facebook)' },
  linkedin: { label: 'LinkedIn', icon: 'ph:linkedin-logo-fill', colorVar: 'var(--color-platform-linkedin)' }
}

// Las únicas plataformas con OAuth real detrás (ver useMySocialAccounts.ts,
// docs/9-INSTAGRAM-OAUTH-SETUP.md y docs/10-YOUTUBE-OAUTH-SETUP.md) —
// centralizado aquí para no repetir la lista en cada pantalla que necesite
// distinguirlas (Redes, Métricas).
export const VERIFIED_SOCIAL_PLATFORMS: Platform[] = ['instagram', 'youtube']

/**
 * El resto (TikTok, X, Facebook, LinkedIn) se muestra como "Próximamente":
 * no hay OAuth real detrás, así que la interfaz no ofrece conectarlas ni
 * las da por conectadas aunque exista una fila antigua sin token (A-R10).
 */
export function isComingSoonPlatform(platform: Platform): boolean {
  return !VERIFIED_SOCIAL_PLATFORMS.includes(platform)
}

export type SocialAccountState = 'connected' | 'disconnected'

/** El mismo par de estados que ya usan SocialAccountRow.vue y PlatformStatCard.vue — centralizado para no repetirlo. */
export function socialAccountState(acc: SocialAccount): SocialAccountState {
  return acc.connected ? 'connected' : 'disconnected'
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatEuros(cents: number | null): string {
  if (!cents) return 'Sin presupuesto'
  return formatMoney(cents)
}

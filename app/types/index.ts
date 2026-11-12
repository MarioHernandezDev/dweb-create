export type Role = 'creator' | 'partner'

export type ChatPrivacy = 'everyone' | 'accepted_offers_only'

export type PostStatus =
  | 'idea'
  | 'in_production'
  | 'ready_for_review'
  | 'scheduled'
  | 'published'
  | 'overdue'

export type CollaborationStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'declined' | 'cancelled' | 'terminated'

export type ContentType = 'video' | 'reel' | 'carousel' | 'image' | 'story'

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'x' | 'facebook' | 'linkedin'

export interface StatusMeta {
  label: string
  colorVar: string
}

/** Un creador de contenido. */
export interface Creator {
  id: string
  name: string
  niche: string
  initials: string
  hue: number
  weeklyTarget: number
}

/** Un partner: la marca/empresa que encarga campañas a un creador. */
export interface Partner {
  id: string
  name: string
  industry: string
  initials: string
  hue: number
}

export interface CoverArt {
  from: string
  to: string
  angle: number
}

export interface Post {
  id: string
  creatorId: string
  collaborationId?: string | null
  title: string
  caption: string
  contentType: ContentType
  platform: Platform
  status: PostStatus
  dueInDays: number
  /** `due_date` en bruto (fecha, "YYYY-MM-DD") — para poder editarla de verdad en un `<input type="date">`; `dueInDays` sigue siendo lo que usa el resto de la UI para agrupar/ordenar. */
  dueDate: string
  hashtags: string[]
  cover: CoverArt
  mediaUrl?: string | null
  successScore?: number
  /** Si el score vino de juzgar el contenido real con el LLM, o solo de la heurística de forma (longitud/hashtags). */
  aiEvaluated?: boolean
  suggestions?: Suggestion[]
  /** Ids de `labels` asignadas — el objeto Label completo vive en `useLabels()`. */
  labelIds: string[]
  /** Recuento agregado del checklist, para pintar la barra de progreso en la card sin cargar los items. */
  checklist: { total: number; done: number }
  /** ISO de `posts.created_at` / `updated_at` (solo publicaciones del creador; para ordenar la lista). */
  createdAt?: string
  updatedAt?: string
  /** Cuándo pasó a `published` (`posts.published_at`); `null` en las publicadas antes de existir ese campo. */
  publishedAt?: string | null
  /** Versión del contenido (`posts.content_version`): sube solo con cambios materiales (título, texto, medio, tipo, plataforma, hashtags). Una aprobación vale para una versión. */
  contentVersion?: number
}

export interface SparklinePoint {
  label: string
  value: number
}

export interface SocialAccount {
  id: string
  platform: Platform
  handle: string
  followers: number
  deltaPct: number
  connected: boolean
  /** Estado guardado de la conexión (A-R2): distinto de `connected` = hay que reconectar. */
  status?: 'connected' | 'expired' | 'revoked' | 'missing_permissions'
  lastSyncedAt?: string | null
}

export interface TrendSuggestion {
  id: string
  platform: Platform
  topic: string
  trendScore: number
  growthPct: number
  hashtags: string[]
  format: string
  detectedAt: string
}

export interface Suggestion {
  kind: 'caption' | 'hashtag' | 'schedule'
  text: string
}

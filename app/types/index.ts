export type Role = 'creator' | 'partner'

export type ChatPrivacy = 'everyone' | 'accepted_offers_only'

export type PostStatus =
  | 'idea'
  | 'in_production'
  | 'ready_for_review'
  | 'scheduled'
  | 'published'
  | 'overdue'

export type CollaborationStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'declined'

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
  followers: number
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
  confidence?: number
  suggestions?: Suggestion[]
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

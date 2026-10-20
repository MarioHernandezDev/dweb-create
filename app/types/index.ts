export type Role = 'manager' | 'creator' | 'client'

export type PostStatus =
  | 'idea'
  | 'in_production'
  | 'ready_for_review'
  | 'scheduled'
  | 'published'
  | 'overdue'

export type ContentType = 'video' | 'reel' | 'carousel' | 'image' | 'story'

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'x' | 'facebook' | 'linkedin'

export interface StatusMeta {
  label: string
  colorVar: string
}

/** Una agencia/representante. Gestiona una cartera (roster) de influencers. */
export interface Manager {
  id: string
  name: string
  focus: string
  initials: string
  hue: number
}

/**
 * Un creador de contenido. `managerId: null` = trabaja independiente, una
 * marca puede contactarle directamente. Si tiene manager, las marcas
 * contactan a través de él y es el manager quien asigna el trabajo.
 */
export interface Influencer {
  id: string
  name: string
  niche: string
  initials: string
  hue: number
  weeklyTarget: number
  followers: number
  managerId: string | null
}

/** Una marca: el "cliente" que encarga campañas a un influencer o manager. */
export interface BrandClient {
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
  influencerId: string
  title: string
  caption: string
  contentType: ContentType
  platform: Platform
  status: PostStatus
  dueInDays: number
  hashtags: string[]
  cover: CoverArt
  successScore?: number
  confidence?: number
  suggestions?: Suggestion[]
}

export interface MetricSummary {
  platform: Platform
  views: number
  likes: number
  comments: number
  shares: number
  deltaPct: number
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
}

export interface Suggestion {
  kind: 'caption' | 'hashtag' | 'schedule'
  text: string
}

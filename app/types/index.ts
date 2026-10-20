export type Role = 'creator' | 'partner'

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

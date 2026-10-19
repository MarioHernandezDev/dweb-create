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

export interface ClientAccount {
  id: string
  name: string
  industry: string
  initials: string
  hue: number
  weeklyTarget: number
}

export interface CoverArt {
  from: string
  to: string
  angle: number
}

export interface Post {
  id: string
  clientId: string
  title: string
  caption: string
  contentType: ContentType
  platform: Platform
  status: PostStatus
  dueInDays: number
  hashtags: string[]
  cover: CoverArt
  successScore?: number
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

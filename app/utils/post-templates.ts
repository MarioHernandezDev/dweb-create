/**
 * Plantillas de publicación y duplicado. Una plantilla guarda lo que se repite de una publicación a otra (título base,
 * texto, formato, redes, hashtags y las tareas del checklist); no guarda ni fecha, ni imagen, ni fase, ni colaboración,
 * ni enlaces: eso es de cada pieza. Va en `proposal_templates` con `kind = 'post'` (migración 20261119110000).
 * Lo guardado es JSON: al leerlo se valida campo a campo, sin fiarse de su forma.
 */
import { contentTypeMeta } from './status'
import type { ContentType, Platform } from '~/types'

export const POST_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube', 'x', 'facebook', 'linkedin']
export const TEMPLATE_CHECKLIST_MAX = 12
export const TITLE_MAX = 120

export interface PostTemplateData {
  title: string
  caption: string
  contentType: ContentType
  platform: Platform
  extraPlatforms: Platform[]
  hashtags: string[]
  checklist: string[]
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

export function sanitizePostTemplate(raw: unknown): PostTemplateData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const types = Object.keys(contentTypeMeta) as ContentType[]
  const platform = POST_PLATFORMS.includes(r.platform as Platform) ? (r.platform as Platform) : 'instagram'
  const extra = Array.isArray(r.extraPlatforms)
    ? [...new Set(r.extraPlatforms.filter((p): p is Platform => POST_PLATFORMS.includes(p as Platform) && p !== platform))].slice(0, 5)
    : []
  const list = (v: unknown, max: number, each: number) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, each)).filter(Boolean).slice(0, max) : []
  return {
    title: text(r.title, TITLE_MAX),
    caption: text(r.caption, 2200),
    contentType: types.includes(r.contentType as ContentType) ? (r.contentType as ContentType) : 'reel',
    platform,
    extraPlatforms: extra,
    hashtags: list(r.hashtags, 30, 60),
    checklist: list(r.checklist, TEMPLATE_CHECKLIST_MAX, 120)
  }
}

/** Plantilla a partir de una publicación existente (y los textos de su checklist). */
export function postTemplateFrom(
  post: { title: string; caption: string; contentType: ContentType; platform: Platform; extraPlatforms?: Platform[]; hashtags: string[] },
  checklist: string[]
): PostTemplateData {
  // El «(copia)» de un duplicado no forma parte de lo que se repite.
  return sanitizePostTemplate({ ...post, title: post.title.replace(/ \(copia\)$/, ''), checklist })
}

/** Título de la copia: «… (copia)», sin pasarse del máximo. */
export function duplicateTitle(title: string): string {
  const suffix = ' (copia)'
  const base = title.trim().replace(/ \(copia\)$/, '')
  return `${base.slice(0, TITLE_MAX - suffix.length)}${suffix}`
}

/** Fecha de la copia: la misma de la original una semana después; si ya quedó atrás, dentro de 3 días. «YYYY-MM-DD». */
export function duplicateDueDate(originalDate: string, today: Date = new Date()): string {
  const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const todayKey = day(today)
  const [y, m, d] = originalDate.split('-').map(Number)
  if (y && m && d) {
    const next = new Date(y, m - 1, d + 7, 12)
    if (day(next) >= todayKey) return day(next)
  }
  const fallback = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 12)
  return day(fallback)
}

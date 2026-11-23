/**
 * Borrador autoguardado de «Nueva publicación»: si se cierra la hoja (o la pestaña) a medias, lo escrito se recupera al volver a
 * abrirla. Vive en el navegador de cada persona (localStorage, con su id en la clave), nunca en la base de datos, y caduca a los
 * 14 días. Lo guardado es JSON: al leerlo se valida con el mismo saneador que las plantillas, sin fiarse de su forma.
 */
import { sanitizePostTemplate, type PostTemplateData } from './post-templates'

export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000
export const draftStorageKey = (userId: string) => `ciberan:post-draft:${userId}`

export interface PostDraft extends PostTemplateData {
  collaborationId: string
  dueDate: string
  /** Momento del último guardado (ms desde 1970). */
  savedAt: number
}

export type PostDraftInput = Omit<PostDraft, 'savedAt' | 'checklist'>

/** Un borrador sin título, texto ni hashtags no merece guardarse (solo tendría opciones por defecto). */
export function isEmptyDraft(d: Pick<PostDraft, 'title' | 'caption' | 'hashtags'>): boolean {
  return !d.title.trim() && !d.caption.trim() && d.hashtags.length === 0
}

export function serializeDraft(d: PostDraftInput, now = Date.now()): string {
  return JSON.stringify({ ...d, savedAt: now })
}

/** Lee un borrador guardado: `null` si no existe, está vacío, caducó o no se puede entender. */
export function parseDraft(raw: string | null | undefined, now = Date.now()): PostDraft | null {
  if (!raw) return null
  let data: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    data = parsed as Record<string, unknown>
  } catch {
    return null
  }
  const savedAt = typeof data.savedAt === 'number' ? data.savedAt : 0
  if (!savedAt || now - savedAt > DRAFT_TTL_MS || savedAt > now + 60_000) return null
  const base = sanitizePostTemplate(data)
  const dueDate = typeof data.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.dueDate) ? data.dueDate : ''
  const draft: PostDraft = {
    ...base,
    checklist: [],
    collaborationId: typeof data.collaborationId === 'string' ? data.collaborationId.slice(0, 64) : '',
    dueDate,
    savedAt
  }
  return isEmptyDraft(draft) ? null : draft
}

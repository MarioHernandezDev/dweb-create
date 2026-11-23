/**
 * Calendario suscribible: lógica pura (sin Vue ni red) de las fechas de entrega que sirve `/api/calendar/<token>`.
 * La suscripción es un enlace privado por persona (token) que un calendario externo (Google, Apple, Outlook) consulta cada
 * cierto tiempo; quien lo tenga ve las fechas de entrega, así que se puede renovar (el enlace anterior deja de valer).
 */
import { buildIcs, type IcsEvent } from './ics'
import { collabTitle } from './collab-phase'

export const FEED_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Quita la extensión `.ics` que algunos calendarios añaden o exigen, y devuelve el token si tiene forma de UUID. */
export function parseFeedToken(raw: unknown): string | null {
  const t = String(raw ?? '').trim().replace(/\.ics$/i, '')
  return FEED_TOKEN_RE.test(t) ? t.toLowerCase() : null
}

/** Cuánto hacia atrás se muestran las entregas ya pasadas (para no llenar el calendario de historial). */
export const FEED_PAST_DAYS = 30

export interface FeedPost { id: string; title: string; dueDate: string | null; collaborationId: string | null; status: string }
export interface FeedCollab { id: string; campaignName: string | null; packageTitle: string | null; brief: string }

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Eventos de día completo de las entregas con fecha, de `FEED_PAST_DAYS` atrás en adelante, ordenados por fecha. */
export function buildFeedEvents(input: { role: 'creator' | 'partner'; posts: FeedPost[]; collabs: FeedCollab[]; origin: string; today: string }): IcsEvent[] {
  const since = addDays(input.today, -FEED_PAST_DAYS)
  const collabById = new Map(input.collabs.map((c) => [c.id, c]))
  return input.posts
    .filter((p) => p.dueDate && p.dueDate.slice(0, 10) >= since)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .map((p) => {
      const collab = p.collaborationId ? collabById.get(p.collaborationId) : undefined
      return {
        uid: `post-${p.id}`,
        date: p.dueDate!.slice(0, 10),
        title: `Entrega: ${p.title}${p.status === 'published' ? ' (publicada)' : ''}`,
        description: collab ? `Colaboración «${collabTitle(collab)}» en CIBERAN` : 'Contenido propio en CIBERAN',
        url: collab ? `${input.origin}/${input.role}/collaborations/${collab.id}` : `${input.origin}/${input.role}/${input.role === 'creator' ? 'post/' + p.id : ''}`.replace(/\/$/, '')
      }
    })
}

export function buildFeedIcs(input: Parameters<typeof buildFeedEvents>[0], now = new Date()): string {
  return buildIcs(buildFeedEvents(input), 'CIBERAN · Entregas', now)
}

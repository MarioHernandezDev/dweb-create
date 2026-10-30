/**
 * Lógica pura de presentación del chat (A-R20). Sin Vue ni Supabase: las
 * reglas de negocio (privacidad, ofertas, lectura) siguen aplicándose en el
 * servidor; esto solo decide QUÉ SE MUESTRA para no dejar al usuario escribir
 * algo que el servidor va a rechazar, ni resumir una oferta sin perspectiva.
 */
import type { ChatPrivacy } from '~/types'

export type ConversationFilter = 'all' | 'unread' | 'offers'
export type MessageKind = 'text' | 'system' | 'offer'

export interface PreviewInput {
  kind: MessageKind | null | undefined
  body: string | null | undefined
  /** El último mensaje es mío. */
  mine: boolean
}

/** Vista previa de una conversación en la bandeja, con perspectiva (quién envió qué). */
export function previewText(p: PreviewInput): string {
  if (!p.kind) return 'Sin mensajes todavía'
  if (p.kind === 'offer') return p.mine ? 'Has enviado una oferta' : 'Te ha enviado una oferta'
  const body = (p.body ?? '').trim()
  if (p.kind === 'system') return body || 'Actividad en la conversación'
  if (!body) return 'Mensaje'
  return p.mine ? `Tú: ${body}` : body
}

export interface ListableConversation {
  id: string
  otherName: string
  unread: boolean
}

/** Búsqueda por nombre (sin distinguir mayúsculas ni acentos) y filtros de la bandeja. */
export function filterConversations<T extends ListableConversation>(
  list: T[],
  opts: { query: string; filter: ConversationFilter },
  pendingOffers: Record<string, number>
): T[] {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = norm(opts.query.trim())
  return list.filter((c) => {
    if (q && !norm(c.otherName).includes(q)) return false
    if (opts.filter === 'unread') return c.unread
    if (opts.filter === 'offers') return (pendingOffers[c.id] ?? 0) > 0
    return true
  })
}

/**
 * ¿Hay que sustituir el compositor de texto por el aviso de privacidad?
 * Solo si el OTRO restringe el texto libre y no hay ninguna oferta aceptada
 * entre ambos. El servidor aplica la misma regla (`send_text_message`); esto
 * evita redactar un mensaje que se va a rechazar. Con la privacidad aún sin
 * conocer (null) NO se bloquea: se deja escribir y el servidor decide.
 */
export function isComposerRestricted(otherPrivacy: ChatPrivacy | null, hasAcceptedOffer: boolean): boolean {
  return otherPrivacy === 'accepted_offers_only' && !hasAcceptedOffer
}

export type OfferStatus = 'pending' | 'accepted' | 'declined'

export interface OfferCopy {
  /** Quién envió la oferta, en la perspectiva del que mira. */
  heading: string
  /** Línea de consecuencia: quién tiene que hacer qué, o qué pasó. */
  consequence: string
}

/** Textos de la tarjeta de oferta según estado y perspectiva. No cambia ninguna regla de negocio. */
export function offerCopy(opts: { status: OfferStatus; mine: boolean; otherName: string; collaborationCreated: boolean }): OfferCopy {
  const heading = opts.mine ? `Tu oferta a ${opts.otherName}` : `Oferta de ${opts.otherName}`
  switch (opts.status) {
    case 'pending':
      return { heading, consequence: opts.mine ? `Esperando a que ${opts.otherName} responda.` : 'Te toca responder: acepta o rechaza esta oferta.' }
    case 'accepted':
      return {
        heading,
        consequence: opts.collaborationCreated
          ? 'Aceptada. Se ha creado la colaboración: gestiónala desde Colaboraciones.'
          : 'Aceptada. El precio queda acordado en esta conversación.'
      }
    case 'declined':
      return { heading, consequence: opts.mine ? `${opts.otherName} ha rechazado la oferta. Puedes hacer otra.` : 'Has rechazado esta oferta.' }
  }
}

/** Icono del mensaje de sistema según su texto (solo hay eventos de oferta hoy). */
export function systemIcon(body: string | null | undefined): string {
  return /acept/i.test(body ?? '') ? 'ph:check-circle-fill' : 'ph:info-fill'
}

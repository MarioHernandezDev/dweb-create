import type { Role } from '~/types'

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string | null
  kind: 'text' | 'system' | 'offer'
  body: string | null
  offerId: string | null
  createdAt: string
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string | null
  kind: 'text' | 'system' | 'offer'
  body: string | null
  offer_id: string | null
  created_at: string
}

interface ConversationRow {
  id: string
  participant_one_id: string
  participant_two_id: string
  participant_one_last_read_at: string | null
  participant_two_last_read_at: string | null
  last_message_at: string | null
  created_at: string
}

export interface ConversationSummary {
  id: string
  otherProfileId: string
  /** El id de la ficha (`creators.id`/`partners.id`) — es lo que espera /profile/[role]/[id], NO profiles.id. Null si por lo que sea no tiene ficha. */
  otherFichaId: string | null
  otherRole: Role
  otherName: string
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unread: boolean
  unreadCount: number
  /** Marca de tiempo cruda de mi último "leído" en esta conversación — la usa chat/[id].vue para fijar el divisor de "X mensajes nuevos" antes de que markRead() la pise. */
  myLastReadAt: string | null
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    kind: row.kind,
    body: row.body,
    offerId: row.offer_id,
    createdAt: row.created_at
  }
}

const MESSAGE_SELECT = 'id, conversation_id, sender_id, kind, body, offer_id, created_at'

// Indicador de "está escribiendo": Supabase Realtime Broadcast, no
// Postgres Changes — es un aviso efímero, no tiene sentido guardarlo en una
// tabla. Un canal por DESTINATARIO (`chat-typing-<profileId>`), no por
// conversación: así basta con una sola suscripción por sesión (igual que
// startRealtime()) para enterarse de "me están escribiendo" sin importar en
// qué conversación sea ni si estás dentro de /chat/[id] o mirando la lista
// en /chat. Vive fuera de useChat() (no en useState) porque son manejadores
// de temporizador/canal, no estado para pintar — no tiene sentido que
// viajen en el payload SSR.
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>()
// Canal de envío por destinatario, cacheado para no reabrir/resuscribir en
// cada pulsación — tipo del canal de Realtime de supabase-js, no vale la
// pena importarlo solo para esto.
const typingSendChannels = new Map<string, any>()
const TYPING_TIMEOUT_MS = 3000

/**
 * Chat 1 a 1 entre perfiles — ver migración 20261021160000_chat_packages_offers.sql.
 * Toda escritura sensible (abrir conversación, enviar texto, marcar leído)
 * pasa por funciones `security definer` (RPC), igual que useOffers.ts.
 * El tiempo real usa Supabase Realtime (Postgres Changes) — parte del mismo
 * proyecto Supabase ya en uso, sin servicio de pago aparte.
 */
export function useChat() {
  const client = useSupabaseClient()
  const { resolveMyProfileId } = useMyProfileId()

  const conversations = useState<ConversationSummary[]>('chat-conversations', () => [])
  const conversationsLoaded = useState<boolean>('chat-conversations-loaded', () => false)
  const messagesByConversation = useState<Record<string, ChatMessage[]>>('chat-messages', () => ({}))
  const unreadCount = useState<number>('chat-unread-count', () => 0)
  const realtimeStarted = useState<boolean>('chat-realtime-started', () => false)
  const sending = useState<boolean>('chat-sending', () => false)
  const typingByConversation = useState<Record<string, boolean>>('chat-typing-by-conversation', () => ({}))
  const typingListenerStarted = useState<boolean>('chat-typing-listener-started', () => false)

  async function refreshUnreadCount() {
    const { data, error } = await client.rpc('my_chat_unread_count' as never)
    if (error) {
      console.error('[useChat] fallo al contar no leídos:', error.message)
      return
    }
    unreadCount.value = (data as number) ?? 0
  }

  async function resolveNames(profileIds: string[]) {
    const names: Record<string, { name: string; role: Role; fichaId: string | null }> = {}
    if (!profileIds.length) return names

    const { data: profiles } = await client.from('profiles').select('id, role, full_name').in('id', profileIds)
    const rows = (profiles ?? []) as { id: string; role: Role; full_name: string | null }[]
    for (const p of rows) names[p.id] = { name: p.full_name || 'Usuario', role: p.role, fichaId: null }

    const creatorIds = rows.filter((p) => p.role === 'creator').map((p) => p.id)
    const partnerIds = rows.filter((p) => p.role === 'partner').map((p) => p.id)

    // Se trae también `id` (el de la propia fila creators/partners, NO
    // profile_id) — es lo que espera la ruta /profile/[role]/[id], igual
    // que ya usan DiscoveryCard.vue y ProfileSearchBar.vue.
    if (creatorIds.length) {
      const { data } = await client.from('creators').select('id, profile_id, display_name').in('profile_id', creatorIds)
      for (const row of (data ?? []) as { id: string; profile_id: string; display_name: string }[]) {
        if (names[row.profile_id]) {
          names[row.profile_id].name = row.display_name
          names[row.profile_id].fichaId = row.id
        }
      }
    }
    if (partnerIds.length) {
      const { data } = await client.from('partners').select('id, profile_id, company_name').in('profile_id', partnerIds)
      for (const row of (data ?? []) as { id: string; profile_id: string; company_name: string }[]) {
        if (names[row.profile_id]) {
          names[row.profile_id].name = row.company_name
          names[row.profile_id].fichaId = row.id
        }
      }
    }

    return names
  }

  async function refreshConversations() {
    const me = await resolveMyProfileId()
    if (!me) return []

    const { data, error } = await client
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
    if (error) {
      console.error('[useChat] fallo al cargar las conversaciones:', error.message)
      return []
    }

    const rows = (data as ConversationRow[]) ?? []
    const otherIds = rows.map((c) => (c.participant_one_id === me ? c.participant_two_id : c.participant_one_id))
    const names = await resolveNames([...new Set(otherIds)])

    const previews: Record<string, ChatMessage> = {}
    // Se agrupa por conversación (no solo el último mensaje) para poder
    // contar cuántos mensajes hay sin leer, no solo un booleano.
    const messagesByConv = new Map<string, MessageRow[]>()
    if (rows.length) {
      const { data: allMessages } = await client
        .from('messages')
        .select(MESSAGE_SELECT)
        .in('conversation_id', rows.map((c) => c.id))
        .order('created_at', { ascending: false })
      for (const row of (allMessages as MessageRow[]) ?? []) {
        if (!previews[row.conversation_id]) previews[row.conversation_id] = mapMessageRow(row)
        const arr = messagesByConv.get(row.conversation_id)
        if (arr) arr.push(row)
        else messagesByConv.set(row.conversation_id, [row])
      }
    }

    conversations.value = rows.map((c) => {
      const otherId = c.participant_one_id === me ? c.participant_two_id : c.participant_one_id
      const myLastRead = c.participant_one_id === me ? c.participant_one_last_read_at : c.participant_two_last_read_at
      const last = previews[c.id]
      const unreadCount = (messagesByConv.get(c.id) ?? []).filter(
        (m) => m.sender_id !== me && (!myLastRead || m.created_at > myLastRead)
      ).length
      return {
        id: c.id,
        otherProfileId: otherId,
        otherFichaId: names[otherId]?.fichaId ?? null,
        otherRole: names[otherId]?.role ?? 'creator',
        otherName: names[otherId]?.name ?? 'Usuario',
        lastMessagePreview: last ? (last.kind === 'offer' ? 'Oferta enviada' : last.body) : null,
        lastMessageAt: c.last_message_at,
        unread: unreadCount > 0,
        unreadCount,
        myLastReadAt: myLastRead
      }
    })
    conversationsLoaded.value = true
    return conversations.value
  }

  async function ensureConversations() {
    if (!conversationsLoaded.value) await refreshConversations()
    return conversations.value
  }

  /**
   * Resuelve UNA conversación concreta directamente (sin depender de que ya
   * esté en la lista cacheada por refreshConversations()) — para abrir
   * chat/[id].vue desde un enlace directo (notificación, oferta recién
   * aceptada…) sin haber visitado antes /chat en esta sesión de pestaña.
   * Siempre consulta fresco y actualiza/añade la entrada en `conversations`.
   */
  async function loadConversationSummary(conversationId: string) {
    const me = await resolveMyProfileId()
    if (!me) return null

    const { data, error } = await client.from('conversations').select('*').eq('id', conversationId).maybeSingle<ConversationRow>()
    if (error || !data) {
      if (error) console.error('[useChat] fallo al cargar la conversación:', error.message)
      return null
    }

    const otherId = data.participant_one_id === me ? data.participant_two_id : data.participant_one_id
    const names = await resolveNames([otherId])
    const myLastRead = data.participant_one_id === me ? data.participant_one_last_read_at : data.participant_two_last_read_at
    const existing = conversations.value.find((c) => c.id === conversationId)

    const summary: ConversationSummary = {
      id: data.id,
      otherProfileId: otherId,
      otherFichaId: names[otherId]?.fichaId ?? null,
      otherRole: names[otherId]?.role ?? 'creator',
      otherName: names[otherId]?.name ?? 'Usuario',
      lastMessagePreview: existing?.lastMessagePreview ?? null,
      lastMessageAt: data.last_message_at,
      unread: existing?.unread ?? false,
      unreadCount: existing?.unreadCount ?? 0,
      myLastReadAt: myLastRead
    }

    conversations.value = [summary, ...conversations.value.filter((c) => c.id !== conversationId)]
    return summary
  }

  async function ensureMessages(conversationId: string) {
    if (messagesByConversation.value[conversationId]) return messagesByConversation.value[conversationId]
    return refreshMessages(conversationId)
  }

  /** Igual que ensureMessages, pero siempre vuelve a consultar — para refrescar tras aceptar/rechazar una oferta sin esperar a Realtime. */
  async function refreshMessages(conversationId: string) {
    const { data, error } = await client
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[useChat] fallo al cargar los mensajes:', error.message)
      return messagesByConversation.value[conversationId] ?? []
    }
    const mapped = (data as MessageRow[]).map(mapMessageRow)
    messagesByConversation.value = { ...messagesByConversation.value, [conversationId]: mapped }
    return mapped
  }

  function pushMessage(message: ChatMessage) {
    const current = messagesByConversation.value[message.conversationId]
    if (!current) return
    if (current.some((m) => m.id === message.id)) return
    messagesByConversation.value = { ...messagesByConversation.value, [message.conversationId]: [...current, message] }
  }

  /** "Iniciar chat" desde el perfil de alguien. Puede fallar si esa persona restringe su chat. */
  async function openConversationWith(targetProfileId: string) {
    const { data, error } = await client.rpc('get_or_create_conversation', { target_profile_id: targetProfileId } as never)
    if (error) throw error
    return data as string
  }

  async function sendMessage(conversationId: string, body: string) {
    sending.value = true
    try {
      const { data, error } = await client.rpc('send_text_message', { p_conversation_id: conversationId, p_body: body } as never)
      if (error) throw error
      const mapped = mapMessageRow(data as MessageRow)
      pushMessage(mapped)
      // Al instante, sin esperar al eco por Realtime — ese viaje de ida y
      // vuelta es justo lo que se veía desfasado en /chat (la fila seguía
      // mostrando el penúltimo mensaje un buen rato tras enviar el último).
      updateConversationPreview(conversationId, mapped, true)
      return mapped
    } finally {
      sending.value = false
    }
  }

  async function markRead(conversationId: string) {
    const { error } = await client.rpc('mark_conversation_read', { p_conversation_id: conversationId } as never)
    if (error) {
      console.error('[useChat] fallo al marcar como leída:', error.message)
      return
    }
    const conv = conversations.value.find((c) => c.id === conversationId)
    if (conv) {
      conv.unread = false
      conv.unreadCount = 0
    }
    await refreshUnreadCount()
  }

  /**
   * Actualiza la fila de /chat de una conversación al vuelo con el mensaje
   * recién llegado — sin volver a pedir el historial completo de mensajes
   * de TODAS las conversaciones (lo que hacía refreshConversations() en
   * cada mensaje, y con listas largas tardaba un buen rato en notarse:
   * el usuario tenía que recargar la página para ver el recuento al día).
   * Si la conversación es nueva para esta sesión (aún no estaba en la
   * lista, p. ej. una oferta que acaba de abrir chat), ahí sí hace falta
   * ir a buscarla entera.
   */
  function updateConversationPreview(conversationId: string, message: ChatMessage, isMine: boolean) {
    const idx = conversations.value.findIndex((c) => c.id === conversationId)
    if (idx === -1) return false

    const current = conversations.value[idx]
    const updated: ConversationSummary = {
      ...current,
      lastMessagePreview: message.kind === 'offer' ? 'Oferta enviada' : message.body,
      lastMessageAt: message.createdAt,
      unread: isMine ? current.unread : true,
      unreadCount: isMine ? current.unreadCount : current.unreadCount + 1
    }
    conversations.value = [updated, ...conversations.value.filter((_, i) => i !== idx)]
    return true
  }

  function applyIncomingMessage(row: MessageRow, me: string | null) {
    const mapped = mapMessageRow(row)
    if (!updateConversationPreview(row.conversation_id, mapped, row.sender_id === me)) refreshConversations()
  }

  /** Suscripción Realtime global — una sola vez por sesión de pestaña (ver TopBar.vue). */
  async function startRealtime() {
    if (realtimeStarted.value) return
    realtimeStarted.value = true
    const me = await resolveMyProfileId()

    client
      .channel('chat-messages-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as MessageRow
        pushMessage(mapMessageRow(row))
        applyIncomingMessage(row, me)
        if (row.sender_id !== me) refreshUnreadCount()
      })
      .subscribe()

    client
      .channel('chat-offers-global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers' }, (payload) => {
        useOffers().setOffer(useOffers().mapOfferRow(payload.new as never))
      })
      .subscribe()
  }

  /**
   * Escucha "me están escribiendo" dirigida a MÍ — una sola vez por sesión
   * (ver TopBar.vue, mismo sitio que startRealtime()). Al recibir un aviso
   * se marca esa conversación como "escribiendo" durante unos segundos; si
   * no llega ninguno nuevo en ese tiempo, se da por hecho que ha parado
   * (no hay un evento explícito de "he dejado de escribir").
   */
  async function startTypingListener() {
    if (typingListenerStarted.value) return
    const me = await resolveMyProfileId()
    if (!me) return
    typingListenerStarted.value = true

    client
      .channel(`chat-typing-${me}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const conversationId = (payload.payload as { conversationId: string }).conversationId
        if (!conversationId) return

        typingByConversation.value = { ...typingByConversation.value, [conversationId]: true }

        const existing = typingTimers.get(conversationId)
        if (existing) clearTimeout(existing)
        typingTimers.set(
          conversationId,
          setTimeout(() => {
            typingByConversation.value = { ...typingByConversation.value, [conversationId]: false }
          }, TYPING_TIMEOUT_MS)
        )
      })
      .subscribe()
  }

  /** Avisa al OTRO participante de que estás escribiendo — se llama con throttling desde el input de chat/[id].vue, nunca en cada pulsación. */
  async function sendTypingPing(conversationId: string, otherProfileId: string) {
    const me = await resolveMyProfileId()
    if (!me) return

    let channel = typingSendChannels.get(otherProfileId)
    if (!channel) {
      channel = client.channel(`chat-typing-${otherProfileId}`)
      channel.subscribe()
      typingSendChannels.set(otherProfileId, channel)
    }
    channel.send({ type: 'broadcast', event: 'typing', payload: { conversationId, fromProfileId: me } })
  }

  return {
    conversations,
    conversationsLoaded,
    messagesByConversation,
    unreadCount,
    sending,
    refreshUnreadCount,
    ensureConversations,
    refreshConversations,
    loadConversationSummary,
    ensureMessages,
    refreshMessages,
    openConversationWith,
    sendMessage,
    markRead,
    startRealtime,
    typingByConversation,
    startTypingListener,
    sendTypingPing
  }
}

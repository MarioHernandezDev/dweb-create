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
  otherAvatarUrl: string | null
  lastMessagePreview: string | null
  /** Tipo del último mensaje y si lo envié yo — la bandeja resume las ofertas con perspectiva (utils/chat-view.ts). */
  lastMessageKind: ChatMessage['kind'] | null
  lastMessageMine: boolean
  lastMessageAt: string | null
  unread: boolean
  unreadCount: number
  /** Marca de tiempo cruda de mi último "leído" en esta conversación — la usa chat/[id].vue para fijar el divisor de "X mensajes nuevos" antes de que markRead() la pise. */
  myLastReadAt: string | null
  /** Marca de tiempo del último "leído" de la OTRA persona — de aquí sale el "Visto" bajo mis mensajes (M-N2): se deriva de `last_read_at`, sin columnas nuevas en `messages`. */
  otherLastReadAt: string | null
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

// Tope para no traer el historial COMPLETO de TODAS las conversaciones en
// cada visita a /chat (antes crecía sin límite con el total acumulado desde
// siempre) — solo hace falta lo más reciente para pintar la preview y
// contar los no leídos. Si hay más de 500 mensajes muy recientes repartidos
// entre tus conversaciones, una charla antigua y poco activa podría tardar
// un poco más en reflejar su contador exacto — mucho mejor que una consulta
// sin límite que no deja de crecer con los años.
const MESSAGE_PREVIEW_LIMIT = 500

// Mismo motivo: cuántas conversaciones carga /chat de una vez. 200 es mucho
// más que cualquier bandeja real necesita ver de golpe — sin esto, alguien
// con años de actividad acababa trayendo TODAS las conversaciones que ha
// tenido alguna vez, para enseñar una lista que nunca se desplaza tanto.
const CONVERSATIONS_LIMIT = 200

// Cuántos mensajes trae un hilo abierto (chat/[id].vue) de una sola vez —
// sin esto, una negociación larga y activa entre las mismas dos personas
// (meses de mensajes) se traía ENTERA cada vez que se abría ese chat. Se
// piden los 300 más RECIENTES (orden descendente) y se invierten en JS para
// mostrarlos en orden cronológico — cargar historial más antiguo con scroll
// hacia arriba queda fuera de esta pasada (no había paginación previa
// tampoco), pero al menos ya no crece sin límite con los años.
const THREAD_MESSAGE_LIMIT = 300
const OLDER_PAGE = 100

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
  // El id de la conversación que tienes abierta en pantalla ahora mismo
  // (ver chat/[id].vue) — mientras lo esté, un mensaje que llegue para ESA
  // conversación no debe contar como "no leído" ni hacer saltar el icono
  // de chat: ya lo estás viendo en directo. `null` si no hay ninguna abierta.
  const activeConversationId = useState<string | null>('chat-active-conversation-id', () => null)
  const realtimeStarted = useState<boolean>('chat-realtime-started', () => false)
  const sending = useState<boolean>('chat-sending', () => false)
  const typingByConversation = useState<Record<string, boolean>>('chat-typing-by-conversation', () => ({}))
  const typingListenerStarted = useState<boolean>('chat-typing-listener-started', () => false)
  // Conversaciones con mensajes anteriores sin cargar (A-R20f): el hilo trae los 300 más recientes y,
  // si había tantos, ofrece cargar los anteriores por cursor de fecha (sin cambios de backend).
  const hasOlderByConversation = useState<Record<string, boolean>>('chat-has-older', () => ({}))
  // Estado del canal de tiempo real (A-R20): la interfaz avisa si se cae en vez de quedarse muda.
  const realtimeStatus = useState<'idle' | 'connected' | 'disconnected'>('chat-realtime-status', () => 'idle')

  async function refreshUnreadCount() {
    const { data, error } = await client.rpc('my_chat_unread_count' as never)
    if (error) {
      console.error('[useChat] fallo al contar no leídos:', error.message)
      return
    }
    unreadCount.value = (data as number) ?? 0
  }

  async function resolveNames(profileIds: string[]) {
    const names: Record<string, { name: string; role: Role; fichaId: string | null; avatarUrl: string | null }> = {}
    if (!profileIds.length) return names

    const { data: profiles } = await client.from('profiles').select('id, role, full_name, avatar_url').in('id', profileIds)
    const rows = (profiles ?? []) as { id: string; role: Role; full_name: string | null; avatar_url: string | null }[]
    for (const p of rows) names[p.id] = { name: p.full_name || 'Usuario', role: p.role, fichaId: null, avatarUrl: p.avatar_url }

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
      .limit(CONVERSATIONS_LIMIT)
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
        .limit(MESSAGE_PREVIEW_LIMIT)
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
      const otherLastRead = c.participant_one_id === me ? c.participant_two_last_read_at : c.participant_one_last_read_at
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
        otherAvatarUrl: names[otherId]?.avatarUrl ?? null,
        lastMessagePreview: last ? (last.kind === 'offer' ? 'Oferta enviada' : last.body) : null,
        lastMessageKind: last?.kind ?? null,
        lastMessageMine: !!last && last.senderId === me,
        lastMessageAt: c.last_message_at,
        unread: unreadCount > 0,
        unreadCount,
        myLastReadAt: myLastRead,
        otherLastReadAt: otherLastRead
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
    const otherLastRead = data.participant_one_id === me ? data.participant_two_last_read_at : data.participant_one_last_read_at
    const existing = conversations.value.find((c) => c.id === conversationId)

    const summary: ConversationSummary = {
      id: data.id,
      otherProfileId: otherId,
      otherFichaId: names[otherId]?.fichaId ?? null,
      otherRole: names[otherId]?.role ?? 'creator',
      otherName: names[otherId]?.name ?? 'Usuario',
      otherAvatarUrl: names[otherId]?.avatarUrl ?? null,
      lastMessagePreview: existing?.lastMessagePreview ?? null,
      lastMessageKind: existing?.lastMessageKind ?? null,
      lastMessageMine: existing?.lastMessageMine ?? false,
      lastMessageAt: data.last_message_at,
      unread: existing?.unread ?? false,
      unreadCount: existing?.unreadCount ?? 0,
      myLastReadAt: myLastRead,
      otherLastReadAt: otherLastRead
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
    // Los THREAD_MESSAGE_LIMIT más recientes, no los más antiguos — se piden
    // en orden descendente y se invierten después, para no acabar cargando
    // el principio de una conversación larga en vez de lo último que se dijo.
    const { data, error } = await client
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(THREAD_MESSAGE_LIMIT)
    if (error) {
      console.error('[useChat] fallo al cargar los mensajes:', error.message)
      return messagesByConversation.value[conversationId] ?? []
    }
    const mapped = (data as MessageRow[]).map(mapMessageRow).reverse()
    messagesByConversation.value = { ...messagesByConversation.value, [conversationId]: mapped }
    hasOlderByConversation.value = { ...hasOlderByConversation.value, [conversationId]: (data as MessageRow[]).length >= THREAD_MESSAGE_LIMIT }
    return mapped
  }

  /** Carga hasta 100 mensajes anteriores al más antiguo ya cargado. Devuelve cuántos añadió (-1 si falló). */
  async function loadOlderMessages(conversationId: string) {
    const current = messagesByConversation.value[conversationId] ?? []
    const oldest = current[0]
    if (!oldest) return 0
    const { data, error } = await client
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('conversation_id', conversationId)
      .lt('created_at', oldest.createdAt)
      .order('created_at', { ascending: false })
      .limit(OLDER_PAGE)
    if (error) {
      console.error('[useChat] fallo al cargar mensajes anteriores:', error.message)
      return -1
    }
    const rows = (data as MessageRow[]).map(mapMessageRow).reverse()
    // Sin duplicados (dos mensajes pueden compartir marca de tiempo exacta con el cursor).
    const known = new Set(current.map((m) => m.id))
    const fresh = rows.filter((m) => !known.has(m.id))
    messagesByConversation.value = { ...messagesByConversation.value, [conversationId]: [...fresh, ...current] }
    hasOlderByConversation.value = { ...hasOlderByConversation.value, [conversationId]: (data as MessageRow[]).length >= OLDER_PAGE }
    return fresh.length
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
  function updateConversationPreview(conversationId: string, message: ChatMessage, isMine: boolean, forceRead = false) {
    const idx = conversations.value.findIndex((c) => c.id === conversationId)
    if (idx === -1) return false

    const current = conversations.value[idx]
    const updated: ConversationSummary = {
      ...current,
      lastMessagePreview: message.kind === 'offer' ? 'Oferta enviada' : message.body,
      lastMessageKind: message.kind,
      lastMessageMine: isMine,
      lastMessageAt: message.createdAt,
      unread: forceRead ? false : isMine ? current.unread : true,
      unreadCount: forceRead ? 0 : isMine ? current.unreadCount : current.unreadCount + 1
    }
    conversations.value = [updated, ...conversations.value.filter((_, i) => i !== idx)]
    return true
  }

  function applyIncomingMessage(row: MessageRow, me: string | null, forceRead = false) {
    const mapped = mapMessageRow(row)
    if (!updateConversationPreview(row.conversation_id, mapped, row.sender_id === me, forceRead)) refreshConversations()
  }

  /** Suscripción Realtime global — una sola vez por sesión de pestaña (ver TopBar.vue). */
  async function startRealtime() {
    // CRÍTICO: nunca en el servidor. TopBar.vue llama a esto en su setup(),
    // que Nuxt ejecuta también en el SSR de cada página — y `realtimeStarted`
    // es un useState, que Nuxt serializa al terminar el SSR y el cliente
    // reutiliza tal cual al hidratar. Sin este guard, la bandera llegaba
    // puesta a `true` desde el servidor ANTES de que el navegador tuviera
    // ocasión de abrir el socket de verdad: el cliente se creía "ya
    // suscrito" y el canal real nunca se llegaba a crear. Por eso nunca
    // aparecía ni un solo evento de Realtime, en ningún caso — no era un
    // problema de reconexión, es que jamás se conectaba.
    if (import.meta.server) return
    if (realtimeStarted.value) return
    realtimeStarted.value = true
    const me = await resolveMyProfileId()

    client
      .channel('chat-messages-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as MessageRow
        pushMessage(mapMessageRow(row))

        // Si YA tienes esta conversación abierta en pantalla en este mismo
        // instante (ver activeConversationId, puesto por chat/[id].vue), un
        // mensaje que llegue para ella no debe contar como "no leído" ni
        // hacer saltar el icono de chat — la estás viendo en directo. Se
        // marca como leída también en el servidor (markRead), no solo en
        // local, para que no vuelva a aparecer como pendiente si recargas.
        const viewingThisConversation = row.conversation_id === activeConversationId.value
        applyIncomingMessage(row, me, viewingThisConversation)

        if (row.sender_id !== me) {
          if (viewingThisConversation) markRead(row.conversation_id)
          else refreshUnreadCount()
          // Una oferta recibida cambia lo pendiente de mi respuesta en la bandeja.
          if (row.kind === 'offer') useOffers().refreshPendingIncoming()
        }
      })
      .subscribe((status) => {
        // Este callback se dispara también tras cada RECONEXIÓN del socket
        // (red inestable, pestaña en segundo plano, el portátil se
        // suspende…), no solo la primera vez. supabase-js reconecta el
        // websocket solo, pero NUNCA reenvía los eventos que pasaron
        // mientras estuvo desconectado — sin este refetch, la lista de
        // /chat se podía quedar con la preview vieja en silencio, sin
        // ningún aviso, hasta la siguiente recarga completa de la página.
        if (status === 'SUBSCRIBED') {
          realtimeStatus.value = 'connected'
          refreshConversations()
          refreshUnreadCount()
          useOffers().refreshPendingIncoming()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          realtimeStatus.value = 'disconnected'
        }
      })

    client
      .channel('chat-offers-global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers' }, (payload) => {
        useOffers().setOffer(useOffers().mapOfferRow(payload.new as never))
        useOffers().refreshPendingIncoming()
      })
      .subscribe()

    // "Visto": la otra persona marca la conversación como leída (UPDATE de `conversations`, tabla ya
    // publicada en Realtime y filtrada por RLS). Sustituye al sondeo cada 15 s del hilo.
    client
      .channel('chat-conversations-global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
        const row = payload.new as ConversationRow
        const idx = conversations.value.findIndex((c) => c.id === row.id)
        if (idx === -1 || !me) return
        const mine = row.participant_one_id === me ? row.participant_one_last_read_at : row.participant_two_last_read_at
        const theirs = row.participant_one_id === me ? row.participant_two_last_read_at : row.participant_one_last_read_at
        const next = [...conversations.value]
        next[idx] = { ...next[idx], myLastReadAt: mine, otherLastReadAt: theirs }
        conversations.value = next
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
    // Mismo motivo que el guard de startRealtime() — ver ese comentario.
    if (import.meta.server) return
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

  // `resetAccountCaches()` nunca llamaba a esto — al saltar de cuenta sin
  // recarga completa (cuentas demo, o un logout→login normal dentro de la
  // misma pestaña, ambos navegación de Nuxt sin recargar la página), la
  // lista de `conversations` se quedaba calculada con el `me` de la cuenta
  // ANTERIOR: `otherId`/`otherName` acababan siendo los de la cuenta nueva
  // vista desde fuera, no los de la otra parte real (ver hallazgo N2 de la
  // auditoría de usabilidad). No se toca `realtimeStarted`/
  // `typingListenerStarted` aquí a propósito: son guardas de "una sola vez
  // por pestaña" para no abrir un canal de Realtime duplicado — resetearlas
  // forzaría una segunda suscripción al mismo canal. La suscripción ya
  // abierta sigue usando el `me` con el que arrancó; es un problema
  // relacionado pero distinto, pendiente de una solución propia (cerrar y
  // reabrir el canal, no solo vaciar estado), no se toca en este cambio.
  function reset() {
    conversations.value = []
    conversationsLoaded.value = false
    messagesByConversation.value = {}
    unreadCount.value = 0
    activeConversationId.value = null
  }

  return {
    conversations,
    conversationsLoaded,
    messagesByConversation,
    unreadCount,
    activeConversationId,
    sending,
    refreshUnreadCount,
    ensureConversations,
    refreshConversations,
    loadConversationSummary,
    ensureMessages,
    refreshMessages,
    loadOlderMessages,
    hasOlderByConversation,
    openConversationWith,
    sendMessage,
    markRead,
    startRealtime,
    typingByConversation,
    realtimeStatus,
    startTypingListener,
    sendTypingPing,
    reset
  }
}

<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { dateDividerLabel } from '~/utils/status'
import type { ChatMessage } from '~/composables/useChat'

// Fuera de /creator y /partner a propósito, igual que inbox.vue y chat/index.vue.
const route = useRoute()
const conversationId = route.params.id as string

useHead({ title: 'Chat' })

const { role, ensureRole } = useMyRole()
const myRole = role.value ?? (await ensureRole()) ?? 'creator'

// `useSupabaseUser().value` puede seguir vacío/desfasado justo al cargar la
// página (ver role-guard.global.ts) — usarlo directo en la plantilla para
// decidir "es mío" dejaba burbujas mal coloreadas/alineadas hasta que ese
// ref se resolvía solo (o a veces ni eso, en una sesión larga). Se resuelve
// una vez de forma fiable, igual que el resto de la app.
const { resolveMyProfileId } = useMyProfileId()
const myProfileId = await resolveMyProfileId()

const { conversations, messagesByConversation, typingByConversation, loadConversationSummary, refreshMessages, sendMessage, markRead, sendTypingPing, activeConversationId } = useChat()

// Siempre en fresco (no ensureOnce): puede llegarse aquí directo desde un
// enlace (notificación, oferta recién aceptada) sin haber pasado antes por
// /chat en esta sesión de pestaña — ensureConversations() por sí solo no
// garantizaría que ESTA conversación concreta ya estuviera cacheada.
// Las dos consultas son independientes entre sí — en paralelo en vez de en
// cascada, que es parte de lo que hacía sentir la página lenta al abrir un chat.
const [summary] = await Promise.all([loadConversationSummary(conversationId), refreshMessages(conversationId)])

// `loadConversationSummary` devuelve null tanto si el id no existe como si
// no eres uno de los dos participantes (RLS de `conversations` filtra por
// participante) — en los dos casos no hay nada que mostrar aquí, igual que
// ya hace profile/[role]/[id].vue con un perfil inexistente.
if (!summary) {
  throw createError({ statusCode: 404, statusMessage: 'Conversación no encontrada' })
}

const conversation = computed(() => conversations.value.find((c) => c.id === conversationId))

// Se captura ANTES de marcar como leído (markRead pisaría esta marca). Con
// ella se fija, una sola vez, a partir de qué mensaje empieza lo no leído
// de esta visita — igual que el divisor de WhatsApp, no se mueve aunque
// luego sigas leyendo o lleguen mensajes nuevos en tiempo real.
const unreadDivider = (() => {
  const lastReadBeforeVisit = summary?.myLastReadAt ?? null
  if (!lastReadBeforeVisit) return null
  const list = messagesByConversation.value[conversationId] ?? []
  const unread = list.filter((m) => m.senderId && m.senderId !== myProfileId && m.createdAt > lastReadBeforeVisit)
  return unread.length ? { beforeMessageId: unread[0].id, count: unread.length } : null
})()

// Ninguna de las dos bloquea el primer pintado del hilo: marcar como leído
// y traer los paquetes del otro perfil (solo hacen falta para el botón "+")
// no tienen por qué retrasar ver los mensajes.
markRead(conversationId)

// Mientras esta página siga montada, cualquier mensaje que llegue por
// Realtime para ESTA conversación se trata como ya leído al instante (ver
// el handler de INSERT en startRealtime(), useChat.ts) — no tiene sentido
// que salte el icono de chat por algo que ya está delante de tus ojos.
activeConversationId.value = conversationId
onUnmounted(() => {
  if (activeConversationId.value === conversationId) activeConversationId.value = null
})

const { listPackagesOf } = usePackages()
const otherPackages = ref<Awaited<ReturnType<typeof listPackagesOf>>>([])
if (summary) listPackagesOf(summary.otherProfileId).then((pkgs) => { otherPackages.value = pkgs })
const offerSheetOpen = ref(false)

// Agrupa mensajes consecutivos del mismo emisor (menos de 5 min entre sí) y
// mete un separador de fecha entre días — igual que cualquier chat decente:
// no hace falta repetir la hora en cada burbuja de una racha, solo en la
// última, y un "Ayer"/"Hoy" en vez de ir contando "hace X horas" a ojo.
const GROUP_WINDOW_MS = 5 * 60_000

type ChatListItem =
  | { type: 'divider'; key: string; label: string }
  | { type: 'unread'; key: string; count: number }
  | { type: 'message'; key: string; message: ChatMessage; groupStart: boolean; showTime: boolean }

function sameGroup(a: ChatMessage, b: ChatMessage) {
  return (
    a.senderId === b.senderId &&
    a.kind === 'text' &&
    b.kind === 'text' &&
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() < GROUP_WINDOW_MS
  )
}

const chatItems = computed<ChatListItem[]>(() => {
  const list = messagesByConversation.value[conversationId] ?? []
  const items: ChatListItem[] = []
  let prevDateKey: string | null = null

  list.forEach((m, i) => {
    const dateKey = new Date(m.createdAt).toDateString()
    if (dateKey !== prevDateKey) {
      items.push({ type: 'divider', key: `divider-${m.id}`, label: dateDividerLabel(m.createdAt) })
      prevDateKey = dateKey
    }
    if (unreadDivider && m.id === unreadDivider.beforeMessageId) {
      items.push({ type: 'unread', key: 'unread-divider', count: unreadDivider.count })
    }

    const prevMessage = list[i - 1]
    const nextMessage = list[i + 1]
    const groupStart = dateKey !== (prevMessage && new Date(prevMessage.createdAt).toDateString()) || !prevMessage || !sameGroup(prevMessage, m)
    const showTime = !nextMessage || !sameGroup(m, nextMessage)

    items.push({ type: 'message', key: m.id, message: m, groupStart, showTime })
  })

  return items
})

const scrollEl = ref<HTMLElement | null>(null)
// Si ya estabas cerca del final, los mensajes nuevos te siguen empujando
// hacia abajo como siempre; si habías subido a leer el historial, NO se te
// tira al final de golpe — aparece un aviso flotante para ir tú cuando quieras.
const nearBottom = ref(true)
const newMessagesBanner = ref(false)

function isScrollNearBottom() {
  const el = scrollEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 150
}

function onScroll() {
  nearBottom.value = isScrollNearBottom()
  if (nearBottom.value) newMessagesBanner.value = false
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

function jumpToBottom() {
  scrollToBottom()
  newMessagesBanner.value = false
}

const isOtherTyping = computed(() => !!typingByConversation.value[conversationId])

watch(() => messagesByConversation.value[conversationId]?.length, () => {
  const list = messagesByConversation.value[conversationId]
  const last = list?.[list.length - 1]
  if (last?.senderId === myProfileId || nearBottom.value) {
    scrollToBottom()
    newMessagesBanner.value = false
  } else {
    newMessagesBanner.value = true
  }
})
watch(isOtherTyping, (typing) => {
  if (typing && nearBottom.value) scrollToBottom()
})
onMounted(() => scrollToBottom())

const draft = ref('')
const sendError = ref('')
const { sending } = useChat()

// Aviso de "estoy escribiendo" al otro participante, con cooldown — nunca
// en cada pulsación, saturaría el canal para nada (el receptor solo
// necesita un aviso cada pocos segundos mientras sigues escribiendo).
let lastTypingPingAt = 0
watch(draft, (value) => {
  if (!value.trim() || !conversation.value) return
  const now = Date.now()
  if (now - lastTypingPingAt < 1500) return
  lastTypingPingAt = now
  sendTypingPing(conversationId, conversation.value.otherProfileId)
})

const offerHint = ref('')
function clickOfferButton() {
  if (!otherPackages.value.length) {
    offerHint.value = 'Este perfil todavía no ha publicado ningún paquete — no se le puede hacer una oferta.'
    return
  }
  offerHint.value = ''
  offerSheetOpen.value = true
}

async function send() {
  if (!draft.value.trim()) return
  sendError.value = ''
  const body = draft.value
  draft.value = ''
  try {
    await sendMessage(conversationId, body)
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : 'No se ha podido enviar el mensaje.'
    draft.value = body
  }
}
</script>

<template>
  <AppShell :role="myRole" :title="conversation?.otherName ?? 'Chat'" full-width>
    <div class="flex flex-col h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-9rem)] md:max-w-2xl">
      <div v-if="conversation" class="flex items-center gap-3 pb-4 mb-2 border-b border-[var(--color-hairline)] shrink-0">
        <BaseAvatar :initials="initialsFromName(conversation.otherName)" :src="conversation.otherAvatarUrl" :hue="hueFromString(conversation.otherName)" size="sm" />
        <NuxtLink
          v-if="conversation.otherFichaId" :to="`/profile/${conversation.otherRole}/${conversation.otherFichaId}`"
          class="text-[0.9375rem] font-medium text-[var(--color-text)] hover:text-[var(--color-primary-500)]"
        >
          {{ conversation.otherName }}
        </NuxtLink>
        <span v-else class="text-[0.9375rem] font-medium text-[var(--color-text)]">{{ conversation.otherName }}</span>
      </div>

      <div class="relative flex-1 min-h-0">
        <div ref="scrollEl" class="h-full overflow-y-auto nx-scroll flex flex-col py-2" @scroll="onScroll">
          <EmptyState
            v-if="!messagesByConversation[conversationId]?.length"
            icon="ph:chat-circle-dots" title="Empieza la conversación"
            description="Escribe un mensaje o, con el botón '+', manda una oferta sobre uno de sus paquetes."
          />
          <template v-for="item in chatItems" :key="item.key">
            <div v-if="item.type === 'divider'" class="flex justify-center my-3">
              <span class="text-[0.6875rem] font-medium text-[var(--color-text-faint)] bg-[var(--color-ink-overlay)] px-3 py-1 rounded-full">{{ item.label }}</span>
            </div>
            <div v-else-if="item.type === 'unread'" class="flex items-center gap-2 my-3">
              <span class="h-px flex-1 bg-[var(--color-primary-500)]/25" />
              <span class="text-[0.6875rem] font-medium text-[var(--color-primary-500)] px-2.5 py-1 rounded-full bg-[var(--color-primary-500)]/10">
                {{ item.count === 1 ? '1 mensaje nuevo' : `${item.count} mensajes nuevos` }}
              </span>
              <span class="h-px flex-1 bg-[var(--color-primary-500)]/25" />
            </div>
            <MessageBubble
              v-else :message="item.message" :mine="item.message.senderId === myProfileId"
              :group-start="item.groupStart" :show-time="item.showTime"
            />
          </template>
          <TypingDots v-if="isOtherTyping" />
        </div>

        <Transition
          enter-active-class="transition-[opacity,transform] duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0 translate-y-2"
          leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0 translate-y-2"
        >
          <button
            v-if="newMessagesBanner" type="button"
            class="absolute z-10 bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--color-primary-500)] text-[var(--color-on-primary)] text-[0.8125rem] font-medium shadow-[var(--shadow-float)]"
            @click="jumpToBottom"
          >
            <Icon name="ph:arrow-down-bold" class="size-3.5" /> Nuevos mensajes
          </button>
        </Transition>
      </div>

      <div class="shrink-0 pt-3">
        <p v-if="sendError" class="text-[0.8125rem] text-[var(--color-status-alert)] mb-2">{{ sendError }}</p>
        <p v-if="offerHint" class="text-[0.8125rem] text-[var(--color-text-muted)] mb-2">{{ offerHint }}</p>
        <form class="flex items-center gap-2" @submit.prevent="send">
          <button
            type="button" aria-label="Hacer oferta"
            :title="otherPackages.length ? 'Hacer oferta' : 'Este perfil no tiene paquetes publicados todavía'"
            class="shrink-0 size-11 flex items-center justify-center rounded-full border border-[var(--color-hairline)] transition-colors"
            :class="otherPackages.length ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary-500)]/50' : 'text-[var(--color-text-faint)]'"
            @click="clickOfferButton"
          >
            <Icon name="ph:plus-bold" class="size-4" />
          </button>
          <input
            v-model="draft" type="text" placeholder="Escribe un mensaje…"
            class="flex-1 h-11 px-4 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
          >
          <BaseButton
            variant="primary" size="md" icon-only icon="ph:paper-plane-tilt-fill" type="submit" :icon-spin="sending"
            :disabled="!draft.trim() || sending" aria-label="Enviar mensaje"
          />
        </form>
      </div>

      <ChatOfferSheet v-model="offerSheetOpen" :packages="otherPackages" />
    </div>
  </AppShell>
</template>

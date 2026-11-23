<script setup lang="ts">
import { errorMessage } from '~/utils/error-message'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { dateDividerLabel } from '~/utils/status'
import { isComposerRestricted } from '~/utils/chat-view'
import type { ChatMessage } from '~/composables/useChat'
import type { ChatPrivacy } from '~/types'

// Hilo de una conversación (A-R20a/c/d). Vive DENTRO del contenedor pages/chat.vue
// (la bandeja sigue a la izquierda); aquí solo está el panel de la conversación.
const route = useRoute()
const conversationId = route.params.id as string

const { role } = useMyRole()
const myRole = (role.value ?? 'creator') as 'creator' | 'partner'
const { resolveMyProfileId } = useMyProfileId()
const myProfileId = await resolveMyProfileId()
const client = useSupabaseClient()

const { conversations, messagesByConversation, typingByConversation, loadConversationSummary, refreshMessages, sendMessage, markRead, sendTypingPing, activeConversationId, sending, realtimeStatus, loadOlderMessages, hasOlderByConversation } = useChat()
const { listPackagesOf } = usePackages()

const conversation = computed(() => conversations.value.find((c) => c.id === conversationId))
const loading = ref(true)
const notFound = ref(false)
useHead({ title: computed(() => (conversation.value ? `Chat con ${conversation.value.otherName}` : 'Chat')) })

// "Visto" solo bajo MI último mensaje que la otra persona ya ha leído. Sale de
// `last_read_at` de la conversación (granularidad de conversación, no por
// mensaje), que ahora llega por Realtime (UPDATE de `conversations`).
const lastSeenMessageId = computed(() => {
  const otherRead = conversation.value?.otherLastReadAt
  if (!otherRead) return null
  const mine = (messagesByConversation.value[conversationId] ?? []).filter((m) => m.senderId === myProfileId && m.kind !== 'system')
  const last = mine[mine.length - 1]
  return last && last.createdAt <= otherRead ? last.id : null
})
// Respaldo por si el canal se cae: sondeo suave (antes cada 15 s).
const seenTimer = import.meta.client ? setInterval(() => loadConversationSummary(conversationId), 60_000) : null
onUnmounted(() => { if (seenTimer) clearInterval(seenTimer) })

// Se fija ANTES de marcar como leído (markRead pisaría la marca): a partir de qué
// mensaje empieza lo no leído de esta visita. No se mueve aunque sigas leyendo.
const unreadDivider = ref<{ beforeMessageId: string; count: number } | null>(null)

const otherPackages = ref<Awaited<ReturnType<typeof listPackagesOf>>>([])
const otherPrivacy = ref<ChatPrivacy | null>(null)
const hasAcceptedOffer = ref(false)
const offerSheetOpen = ref(false)

// Privacidad (Escenario B): del otro se lee `chat_privacy` (público) y de MIS ofertas
// aceptadas con él (RLS: solo las partes). El servidor aplica la misma regla.
async function loadPrivacy(otherProfileId: string) {
  const [{ data: prof }, { data: accepted }] = await Promise.all([
    client.from('profiles').select('chat_privacy').eq('id', otherProfileId).maybeSingle<{ chat_privacy: ChatPrivacy }>(),
    client.from('offers').select('id').eq('status', 'accepted')
      .or(`and(from_profile_id.eq.${myProfileId},to_profile_id.eq.${otherProfileId}),and(from_profile_id.eq.${otherProfileId},to_profile_id.eq.${myProfileId})`).limit(1)
  ])
  otherPrivacy.value = prof?.chat_privacy ?? null
  hasAcceptedOffer.value = (accepted ?? []).length > 0
}
const restricted = computed(() => isComposerRestricted(otherPrivacy.value, hasAcceptedOffer.value))

onMounted(async () => {
  const [summary] = await Promise.all([loadConversationSummary(conversationId), refreshMessages(conversationId)])
  if (!summary) {
    notFound.value = true
    loading.value = false
    return
  }
  // Si nunca la has abierto (sin marca de lectura), todo lo del otro es nuevo.
  const lastRead = summary.myLastReadAt ?? '1970-01-01T00:00:00Z'
  const unread = (messagesByConversation.value[conversationId] ?? []).filter((m) => m.senderId && m.senderId !== myProfileId && m.createdAt > lastRead)
  if (unread.length) unreadDivider.value = { beforeMessageId: unread[0]!.id, count: unread.length }
  markRead(conversationId)
  // Mientras esta página siga montada, un mensaje que llegue para ESTA conversación se trata como leído al instante.
  activeConversationId.value = conversationId
  loading.value = false
  scrollToBottom()
  listPackagesOf(summary.otherProfileId).then((pkgs) => { otherPackages.value = pkgs })
  loadPrivacy(summary.otherProfileId)
})
onUnmounted(() => {
  if (activeConversationId.value === conversationId) activeConversationId.value = null
})

// Si llega un mensaje de sistema (p. ej. oferta aceptada) se vuelve a evaluar la privacidad.
watch(() => messagesByConversation.value[conversationId]?.at(-1)?.kind, (kind) => {
  if (kind === 'system' && conversation.value) loadPrivacy(conversation.value.otherProfileId)
})

// Agrupa mensajes consecutivos del mismo emisor (menos de 5 min) y separa por días.
const GROUP_WINDOW_MS = 5 * 60_000
type ChatListItem =
  | { type: 'divider'; key: string; label: string }
  | { type: 'unread'; key: string; count: number }
  | { type: 'message'; key: string; message: ChatMessage; groupStart: boolean; showTime: boolean }

function sameGroup(a: ChatMessage, b: ChatMessage) {
  return a.senderId === b.senderId && a.kind === 'text' && b.kind === 'text' && new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() < GROUP_WINDOW_MS
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
    if (unreadDivider.value && m.id === unreadDivider.value.beforeMessageId) items.push({ type: 'unread', key: 'unread-divider', count: unreadDivider.value.count })
    const prev = list[i - 1]
    const next = list[i + 1]
    const groupStart = !prev || dateKey !== new Date(prev.createdAt).toDateString() || !sameGroup(prev, m)
    const showTime = !next || !sameGroup(m, next)
    items.push({ type: 'message', key: m.id, message: m, groupStart, showTime })
  })
  return items
})

const scrollEl = ref<HTMLElement | null>(null)
// Si estabas cerca del final, los mensajes nuevos te siguen; si leías historial NO se te tira al final.
const nearBottom = ref(true)
const newMessagesBanner = ref(false)
function onScroll() {
  const el = scrollEl.value
  nearBottom.value = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 150
  if (nearBottom.value) newMessagesBanner.value = false
}
function scrollToBottom() {
  requestAnimationFrame(() => { if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight })
}
function jumpToBottom() {
  scrollToBottom()
  newMessagesBanner.value = false
}
const isOtherTyping = computed(() => !!typingByConversation.value[conversationId])

// Mensajes anteriores (A-R20f): se añaden arriba SIN mover lo que estás leyendo.
const loadingOlder = ref(false)
const olderError = ref('')
async function loadOlder() {
  const el = scrollEl.value
  const before = el ? el.scrollHeight - el.scrollTop : 0
  loadingOlder.value = true
  olderError.value = ''
  const added = await loadOlderMessages(conversationId)
  loadingOlder.value = false
  if (added < 0) { olderError.value = 'No se han podido cargar los mensajes anteriores.'; return }
  await nextTick()
  if (el) el.scrollTop = el.scrollHeight - before
}
watch(() => messagesByConversation.value[conversationId]?.length, () => {
  const list = messagesByConversation.value[conversationId]
  const last = list?.[list.length - 1]
  if (last?.senderId === myProfileId || nearBottom.value) {
    scrollToBottom()
    newMessagesBanner.value = false
  } else newMessagesBanner.value = true
})
watch(isOtherTyping, (typing) => { if (typing && nearBottom.value) scrollToBottom() })

// Conexión: se distingue "sin red" y "tiempo real caído" de una conversación sin actividad.
const online = ref(true)
function setOnline() { online.value = navigator.onLine }
onMounted(() => {
  setOnline()
  window.addEventListener('online', setOnline)
  window.addEventListener('offline', setOnline)
})
onUnmounted(() => {
  window.removeEventListener('online', setOnline)
  window.removeEventListener('offline', setOnline)
})
const connectionIssue = computed(() => (!online.value ? 'Sin conexión: los mensajes no se enviarán hasta que vuelva.' : realtimeStatus.value === 'disconnected' ? 'Reconectando: puede que tardes en ver los mensajes nuevos.' : ''))

const draft = ref('')
const sendError = ref('')
// Aviso de "estoy escribiendo", con cooldown: nunca en cada pulsación.
let lastTypingPingAt = 0
watch(draft, (value) => {
  if (!value.trim() || !conversation.value) return
  const now = Date.now()
  if (now - lastTypingPingAt < 1500) return
  lastTypingPingAt = now
  sendTypingPing(conversationId, conversation.value.otherProfileId)
})

const offerHint = ref('')
function openOffer() {
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
    // Nunca se muestra como enviado si el servidor no lo confirmó: el texto vuelve al campo.
    sendError.value = errorMessage(e, 'No se ha podido enviar el mensaje.')
    draft.value = body
  }
}

const roleLabel = computed(() => (conversation.value?.otherRole === 'partner' ? 'Empresa' : 'Creador de contenido'))
</script>

<template>
  <div v-if="notFound" class="flex h-full flex-1 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-hairline)]" data-chat-notfound>
    <EmptyState icon="ph:chat-circle-slash" title="Conversación no encontrada" description="No existe o no eres uno de sus participantes.">
      <NuxtLink to="/chat" class="text-sm font-medium text-[var(--color-primary-500)] underline underline-offset-2">Volver a mis conversaciones</NuxtLink>
    </EmptyState>
  </div>

  <div v-else class="flex min-h-0 flex-1 flex-col rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)]" data-chat-thread>
    <header class="flex shrink-0 items-center gap-3 border-b border-[var(--color-hairline)] px-3 py-3 md:px-5" data-thread-header>
      <NuxtLink to="/chat" class="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)] lg:hidden" aria-label="Volver a las conversaciones" data-thread-back>
        <Icon name="ph:arrow-left-bold" class="size-4" />
      </NuxtLink>
      <template v-if="conversation">
        <BaseAvatar :initials="initialsFromName(conversation.otherName)" :src="conversation.otherAvatarUrl" :hue="hueFromString(conversation.otherName)" size="sm" />
        <div class="min-w-0 flex-1">
          <NuxtLink
            v-if="conversation.otherFichaId" :to="`/profile/${conversation.otherRole}/${conversation.otherFichaId}`"
            class="block truncate text-base font-medium text-[var(--color-text)] hover:text-[var(--color-primary-500)]" data-thread-name
          >{{ conversation.otherName }}</NuxtLink>
          <span v-else class="block truncate text-base font-medium text-[var(--color-text)]" data-thread-name>{{ conversation.otherName }}</span>
          <p class="text-micro text-[var(--color-text-faint)]">
            <span v-if="isOtherTyping" class="font-medium text-[var(--color-primary-500)]">Escribiendo…</span>
            <template v-else>{{ roleLabel }}</template>
          </p>
        </div>
        <NuxtLink
          v-if="conversation.otherFichaId" :to="`/profile/${conversation.otherRole}/${conversation.otherFichaId}`"
          class="hidden h-9 items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-3.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] sm:inline-flex"
        >
          <Icon name="ph:user-circle" class="size-4" /> Ver perfil
        </NuxtLink>
      </template>
      <SkeletonBlock v-else width="9rem" height="1rem" />
    </header>

    <p v-if="connectionIssue" class="shrink-0 border-b border-[var(--color-status-review)]/30 bg-[var(--color-status-review)]/10 px-4 py-2 text-sm text-[var(--color-text)]" role="status" data-connection-banner>{{ connectionIssue }}</p>

    <div class="relative min-h-0 flex-1">
      <div ref="scrollEl" class="h-full overflow-y-auto nx-scroll px-3 py-2 md:px-5" role="log" aria-live="polite" aria-label="Mensajes de la conversación" @scroll="onScroll" data-thread-scroll>
        <div class="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          <div v-if="loading" class="mt-4 flex flex-col gap-3" data-thread-loading aria-busy="true">
            <SkeletonBlock width="55%" height="2.5rem" rounded="var(--radius-md)" />
            <SkeletonBlock width="40%" height="2.5rem" rounded="var(--radius-md)" class="self-end" />
            <SkeletonBlock width="65%" height="3.5rem" rounded="var(--radius-md)" />
          </div>
          <EmptyState
            v-else-if="!messagesByConversation[conversationId]?.length"
            icon="ph:chat-circle-dots" title="Empieza la conversación"
            :description="restricted ? 'Esta persona solo recibe texto tras una oferta aceptada: empieza con una oferta.' : 'Escribe un mensaje o, con el botón Oferta, manda una oferta sobre uno de sus paquetes.'"
          />
          <div v-if="hasOlderByConversation[conversationId] && !loading" class="my-3 flex flex-col items-center gap-1" data-load-older>
            <BaseButton variant="secondary" size="sm" icon="ph:arrow-up-bold" :icon-spin="loadingOlder" :disabled="loadingOlder" @click="loadOlder">
              {{ loadingOlder ? 'Cargando…' : 'Cargar mensajes anteriores' }}
            </BaseButton>
            <p v-if="olderError" class="text-micro text-[var(--color-status-alert)]" role="alert">{{ olderError }}</p>
          </div>
          <template v-for="item in chatItems" :key="item.key">
            <div v-if="item.type === 'divider'" class="my-3 flex justify-center">
              <span class="rounded-full bg-[var(--color-ink-overlay)] px-3 py-1 text-micro font-medium text-[var(--color-text-faint)]">{{ item.label }}</span>
            </div>
            <div v-else-if="item.type === 'unread'" class="my-3 flex items-center gap-2" data-unread-divider>
              <span class="h-px flex-1 bg-[var(--color-primary-500)]/25" />
              <span class="rounded-full bg-[var(--color-primary-500)]/10 px-2.5 py-1 text-micro font-medium text-[var(--color-primary-500)]">
                {{ item.count === 1 ? '1 mensaje nuevo' : `${item.count} mensajes nuevos` }}
              </span>
              <span class="h-px flex-1 bg-[var(--color-primary-500)]/25" />
            </div>
            <MessageBubble
              v-else :message="item.message" :mine="item.message.senderId === myProfileId" :group-start="item.groupStart" :show-time="item.showTime"
              :seen="item.message.id === lastSeenMessageId" :other-name="conversation?.otherName" :my-role="myRole"
            />
          </template>
          <TypingDots v-if="isOtherTyping" />
        </div>
      </div>

      <Transition
        enter-active-class="transition-[opacity,transform] duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0 translate-y-2"
        leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0 translate-y-2"
      >
        <button
          v-if="newMessagesBanner" type="button"
          class="absolute bottom-3 left-1/2 z-10 inline-flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--color-primary-500)] px-4 text-sm font-medium text-[var(--color-on-primary)] shadow-[var(--shadow-float)]"
          @click="jumpToBottom"
        >
          <Icon name="ph:arrow-down-bold" class="size-3.5" /> Nuevos mensajes
        </button>
      </Transition>
    </div>

    <div class="shrink-0 px-3 pb-3 md:px-5">
      <div class="mx-auto w-full max-w-3xl">
        <ChatComposer
          v-model="draft" :sending="sending" :restricted="restricted" :other-name="conversation?.otherName ?? 'Esta persona'"
          :can-offer="otherPackages.length > 0" :error="sendError" :offer-hint="offerHint" @send="send" @offer="openOffer"
        />
      </div>
    </div>

    <ChatOfferSheet v-model="offerSheetOpen" :packages="otherPackages" />
  </div>
</template>

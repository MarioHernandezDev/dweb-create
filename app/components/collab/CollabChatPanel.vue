<script setup lang="ts">
import { errorMessage } from '~/utils/error-message'

/**
 * Conversación con la otra parte, dentro de la página de la colaboración. Es el mismo chat de siempre (misma
 * conversación 1 a 1, mismas RPC y mismo tiempo real que /chat): aquí se ven los últimos mensajes y se responde
 * sin salir. Respeta la privacidad del chat de la otra persona: si no admite mensajes, se explica el motivo.
 */
const props = defineProps<{ counterpartProfileId: string | null; counterpartName: string; role: 'creator' | 'partner' }>()

const { messagesByConversation, openConversationWith, ensureMessages, sendMessage, markRead, sending, activeConversationId, loadConversationSummary, conversations } = useChat()
const { resolveMyProfileId } = useMyProfileId()
const client = useSupabaseClient()

const VISIBLE = 30
const conversationId = ref<string | null>(null)
const myId = ref<string | null>(null)
const state = ref<'loading' | 'ready' | 'blocked'>('loading')
const blockedReason = ref('')
const draft = ref('')
const error = ref('')
const opening = ref(false)
const listEl = ref<HTMLElement | null>(null)

const all = computed(() => (conversationId.value ? messagesByConversation.value[conversationId.value] ?? [] : []))
const messages = computed(() => all.value.slice(-VISIBLE))
const hidden = computed(() => Math.max(0, all.value.length - VISIBLE))
const otherLastReadAt = computed(() => conversations.value.find((c) => c.id === conversationId.value)?.otherLastReadAt ?? null)
const lastMineSeenId = computed(() => {
  const read = otherLastReadAt.value
  if (!read) return null
  const mine = messages.value.filter((m) => m.senderId === myId.value && m.kind === 'text')
  const last = mine[mine.length - 1]
  return last && last.createdAt <= read ? last.id : null
})
const quickReplies = ['Recibido, gracias', '¿Puedes revisarlo?', 'Propongo otra fecha', 'Lo tengo esta semana']

function scrollToEnd() {
  nextTick(() => { if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight })
}

async function attach(id: string) {
  conversationId.value = id
  await Promise.all([ensureMessages(id), loadConversationSummary(id)])
  activeConversationId.value = id
  markRead(id)
}

async function init() {
  if (!props.counterpartProfileId) {
    state.value = 'blocked'
    blockedReason.value = 'La otra parte ya no tiene una cuenta activa.'
    return
  }
  try {
    const me = await resolveMyProfileId()
    myId.value = me
    // Solo se busca la conversación: no se crea por abrir la página (se crea al enviar el primer mensaje).
    const other = props.counterpartProfileId
    const { data, error: findError } = await client.from('conversations').select('id')
      .or(`and(participant_one_id.eq.${me},participant_two_id.eq.${other}),and(participant_one_id.eq.${other},participant_two_id.eq.${me})`)
      .limit(1).maybeSingle<{ id: string }>()
    if (findError) throw findError
    if (data?.id) await attach(data.id)
    state.value = 'ready'
    scrollToEnd()
  } catch (e) {
    state.value = 'blocked'
    blockedReason.value = errorMessage(e, 'No se ha podido abrir la conversación.')
  }
}
onMounted(init)
onBeforeUnmount(() => { if (conversationId.value && activeConversationId.value === conversationId.value) activeConversationId.value = null })

// Un mensaje nuevo (mío o por tiempo real) baja la lista y, al estar a la vista, cuenta como leído.
watch(() => all.value.length, (n, old) => {
  if (!conversationId.value || n <= old) return
  scrollToEnd()
  if (all.value[n - 1]?.senderId !== myId.value) markRead(conversationId.value)
})

async function send(text?: string) {
  const body = (text ?? draft.value).trim()
  if (!body || !props.counterpartProfileId || sending.value || opening.value) return
  error.value = ''
  try {
    if (!conversationId.value) {
      // Primer mensaje: aquí se crea la conversación (puede negarse si la otra persona restringe su chat).
      opening.value = true
      try { await attach(await openConversationWith(props.counterpartProfileId)) } finally { opening.value = false }
    }
    await sendMessage(conversationId.value!, body)
    if (!text) draft.value = ''
  } catch (e) {
    error.value = errorMessage(e, 'No se ha podido enviar el mensaje. Inténtalo de nuevo.')
  }
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send() }
}
</script>

<template>
  <div class="cchat" data-collab-chat>
    <div v-if="state === 'loading'" aria-busy="true"><SkeletonBlock height="6rem" rounded="var(--radius-md)" /></div>

    <p v-else-if="state === 'blocked'" class="cchat__empty" role="status">
      <Icon name="ph:lock-simple" class="size-4" /> {{ blockedReason }}
    </p>

    <template v-else>
      <div ref="listEl" class="cchat__list nx-scroll" role="log" aria-live="polite" :aria-label="`Conversación con ${counterpartName}`">
        <NuxtLink v-if="hidden" :to="`/chat/${conversationId}`" class="cchat__older">{{ hidden === 1 ? 'Ver el mensaje anterior' : `Ver los ${hidden} mensajes anteriores` }}</NuxtLink>
        <p v-if="!messages.length" class="cchat__empty">Todavía no os habéis escrito. Usa este chat para concretar detalles de la colaboración.</p>
        <MessageBubble
          v-for="(m, i) in messages" :key="m.id" :message="m" :mine="m.senderId === myId" :other-name="counterpartName" :my-role="role"
          :group-start="i === 0 || messages[i - 1]!.senderId !== m.senderId || messages[i - 1]!.kind !== m.kind" :seen="m.id === lastMineSeenId"
        />
      </div>

      <div class="cchat__quick" role="group" aria-label="Respuestas rápidas">
        <button v-for="q in quickReplies" :key="q" type="button" class="chip chip--sm chip--outline" :disabled="sending || opening" @click="send(q)">{{ q }}</button>
      </div>
      <form class="cchat__form" @submit.prevent="send()">
        <label class="sr-only" for="collab-chat-draft">Mensaje para {{ counterpartName }}</label>
        <textarea id="collab-chat-draft" v-model="draft" class="textarea" rows="2" maxlength="2000" :placeholder="`Escribe a ${counterpartName}…`" @keydown="onKeydown" />
        <BaseButton type="submit" variant="primary" size="sm" icon="ph:paper-plane-right-fill" :loading="sending || opening" :disabled="!draft.trim()">Enviar</BaseButton>
      </form>
      <p v-if="error" class="collab-error" role="alert">{{ error }}</p>
      <NuxtLink v-if="conversationId" :to="`/chat/${conversationId}`" class="link-arrow cchat__full">Abrir el chat completo <Icon name="ph:arrow-right-bold" class="size-4" /></NuxtLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'

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

const { conversations, messagesByConversation, loadConversationSummary, refreshMessages, sendMessage, markRead } = useChat()

// Siempre en fresco (no ensureOnce): puede llegarse aquí directo desde un
// enlace (notificación, oferta recién aceptada) sin haber pasado antes por
// /chat en esta sesión de pestaña — ensureConversations() por sí solo no
// garantizaría que ESTA conversación concreta ya estuviera cacheada.
const summary = await loadConversationSummary(conversationId)
await refreshMessages(conversationId)

const conversation = computed(() => conversations.value.find((c) => c.id === conversationId))

await markRead(conversationId)

// Paquetes del OTRO perfil — el botón "+" solo deja ofertar sobre paquetes
// reales que ya existan (nunca se inventa una oferta, ver create_offer en
// la migración). Si no tiene ninguno publicado, el botón queda deshabilitado.
const { listPackagesOf } = usePackages()
const otherPackages = ref(summary ? await listPackagesOf(summary.otherProfileId) : [])
const offerSheetOpen = ref(false)

const scrollEl = ref<HTMLElement | null>(null)
function scrollToBottom() {
  requestAnimationFrame(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

watch(() => messagesByConversation.value[conversationId]?.length, () => scrollToBottom())
onMounted(() => scrollToBottom())

const draft = ref('')
const sendError = ref('')
const { sending } = useChat()

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
        <BaseAvatar :initials="initialsFromName(conversation.otherName)" :hue="hueFromString(conversation.otherName)" size="sm" />
        <NuxtLink
          v-if="conversation.otherFichaId" :to="`/profile/${conversation.otherRole}/${conversation.otherFichaId}`"
          class="text-[0.9375rem] font-medium text-[var(--color-text)] hover:text-[var(--color-primary-500)]"
        >
          {{ conversation.otherName }}
        </NuxtLink>
        <span v-else class="text-[0.9375rem] font-medium text-[var(--color-text)]">{{ conversation.otherName }}</span>
      </div>

      <div ref="scrollEl" class="flex-1 overflow-y-auto nx-scroll flex flex-col gap-2.5 py-2">
        <EmptyState
          v-if="!messagesByConversation[conversationId]?.length"
          icon="ph:chat-circle-dots" title="Empieza la conversación"
          description="Escribe un mensaje o, con el botón '+', manda una oferta sobre uno de sus paquetes."
        />
        <MessageBubble
          v-for="m in messagesByConversation[conversationId]" :key="m.id" :message="m" :mine="m.senderId === myProfileId"
        />
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
          <BaseButton variant="primary" size="md" icon-only icon="ph:paper-plane-tilt-fill" type="submit" :icon-spin="sending" :disabled="!draft.trim() || sending" />
        </form>
      </div>

      <ChatOfferSheet v-model="offerSheetOpen" :packages="otherPackages" />
    </div>
  </AppShell>
</template>

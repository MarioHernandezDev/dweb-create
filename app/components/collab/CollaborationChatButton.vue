<script setup lang="ts">
/**
 * Acceso directo al chat con la otra parte desde el detalle de una
 * colaboración (C-11/4.4 de docs/audit/08_COLLABORATION_FLOW_AUDIT.md). Usa la
 * misma RPC que «Iniciar chat» del perfil público, así que respeta
 * `chat_privacy`: si la otra parte solo admite mensajes tras una oferta
 * aceptada, se muestra el motivo en vez de fallar en silencio.
 */
const props = defineProps<{
  counterpartProfileId: string | null
  counterpartName: string
}>()

const { openConversationWith } = useChat()
const router = useRouter()
const opening = ref(false)
const error = ref('')

async function open() {
  if (!props.counterpartProfileId || opening.value) return
  error.value = ''
  opening.value = true
  try {
    const conversationId = await openConversationWith(props.counterpartProfileId)
    await router.push(`/chat/${conversationId}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se ha podido abrir el chat.'
  } finally {
    opening.value = false
  }
}
</script>

<template>
  <div v-if="counterpartProfileId" class="shrink-0">
    <BaseButton
      variant="secondary" size="sm" icon="ph:chat-circle-fill" :icon-spin="opening" :disabled="opening"
      :aria-label="`Abrir el chat con ${counterpartName}`" data-collab-chat @click="open"
    >
      Chat
    </BaseButton>
    <p v-if="error" class="mt-1.5 max-w-56 text-[0.75rem] text-[var(--color-status-alert)]" role="alert">{{ error }}</p>
  </div>
</template>

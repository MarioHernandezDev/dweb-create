<script setup lang="ts">
/**
 * Compositor del chat (A-R20d). Textarea que crece (hasta ~6 líneas), Enter
 * envía y Mayús+Enter salta de línea, botón «Oferta» con texto (distinto de
 * enviar). Si el otro restringe el texto libre y aún no hay oferta aceptada,
 * se sustituye por una explicación con la vía legítima (la oferta): así no se
 * redacta un mensaje que el servidor va a rechazar. El servidor sigue siendo
 * la barrera real. Sin adjuntar, grabar, editar ni borrar: no existen.
 */
const draft = defineModel<string>({ required: true })
const props = defineProps<{
  sending: boolean
  restricted: boolean
  otherName: string
  canOffer: boolean
  error: string
  offerHint: string
}>()
const emit = defineEmits<{ send: []; offer: [] }>()

const el = ref<HTMLTextAreaElement | null>(null)
function resize() {
  const t = el.value
  if (!t) return
  t.style.height = 'auto'
  t.style.height = `${Math.min(t.scrollHeight, 144)}px`
}
watch(draft, () => nextTick(resize))
onMounted(resize)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    if (draft.value.trim() && !props.sending) emit('send')
  }
}
</script>

<template>
  <div class="shrink-0 pt-3" data-composer>
    <p v-if="error" class="mb-2 text-[0.8125rem] text-[var(--color-status-alert)]" role="alert" data-send-error>{{ error }}</p>
    <p v-if="offerHint" class="mb-2 text-[0.8125rem] text-[var(--color-text-muted)]">{{ offerHint }}</p>

    <div v-if="restricted" class="rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-ink-overlay)] p-4" data-composer-restricted>
      <p class="flex items-start gap-2 text-[0.875rem] text-[var(--color-text)]">
        <Icon name="ph:lock-simple-fill" class="mt-0.5 size-4 shrink-0 text-[var(--color-text-faint)]" />
        <span>{{ otherName }} solo recibe mensajes de texto después de aceptar una oferta contigo.</span>
      </p>
      <p class="mt-1 pl-6 text-[0.8125rem] text-[var(--color-text-muted)]">
        {{ canOffer ? 'Puedes empezar haciéndole una oferta sobre uno de sus paquetes.' : 'Todavía no ha publicado ningún paquete, así que de momento no se le puede ofertar.' }}
      </p>
      <BaseButton v-if="canOffer" variant="primary" size="sm" icon="ph:tag-fill" class="mt-3 ml-6" data-offer-open @click="emit('offer')">Hacer una oferta</BaseButton>
    </div>

    <form v-else class="flex items-end gap-2" @submit.prevent="draft.trim() && !sending && emit('send')">
      <button
        type="button" :title="canOffer ? 'Hacer una oferta sobre uno de sus paquetes' : 'Este perfil no tiene paquetes publicados todavía'"
        class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-3.5 text-[0.8125rem] font-medium transition-colors"
        :class="canOffer ? 'text-[var(--color-text-muted)] hover:border-[var(--color-primary-500)]/50 hover:text-[var(--color-text)]' : 'text-[var(--color-text-faint)]'"
        data-offer-open @click="emit('offer')"
      >
        <Icon name="ph:tag-fill" class="size-4" /> <span class="hidden sm:inline">Oferta</span><span class="sr-only sm:hidden">Hacer oferta</span>
      </button>
      <label class="sr-only" for="chat-draft">Escribe un mensaje</label>
      <textarea
        id="chat-draft" ref="el" v-model="draft" rows="1" placeholder="Escribe un mensaje…" data-draft
        class="max-h-36 min-h-11 flex-1 resize-none rounded-[1.375rem] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)] px-4 py-2.5 text-[0.9375rem] leading-snug text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
        @keydown="onKeydown" @input="resize"
      />
      <BaseButton
        variant="primary" size="md" icon-only icon="ph:paper-plane-tilt-fill" type="submit" :icon-spin="sending"
        :disabled="!draft.trim() || sending" aria-label="Enviar mensaje" data-send
      />
    </form>
    <p v-if="!restricted" class="mt-1.5 hidden px-1 text-[0.6875rem] text-[var(--color-text-faint)] md:block">Intro envía · Mayús+Intro salta de línea</p>
  </div>
</template>

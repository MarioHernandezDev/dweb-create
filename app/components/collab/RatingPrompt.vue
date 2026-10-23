<script setup lang="ts">
const props = defineProps<{
  collaborationId: string
  counterpartName: string
}>()

const { myRatings, submitting, submitError, ensureMyRatingsLoaded, submitRating } = useRatings()

// Sin `await` a nivel de script, mismo motivo que NegotiationPanel.vue: este
// componente vive dentro de una hoja inferior que se monta/desmonta con
// `v-if`, fuera del Suspense inicial de la página.
onMounted(() => ensureMyRatingsLoaded())

const myRating = computed(() => myRatings.value[props.collaborationId] ?? null)

const stars = ref(0)
const comment = ref('')

async function send() {
  if (!stars.value) return
  try {
    await submitRating(props.collaborationId, stars.value, comment.value)
  } catch {
    // submitError ya queda puesto por el composable — el formulario se deja como está para reintentar.
  }
}
</script>

<template>
  <div class="pt-3 mt-1 border-t border-[var(--color-hairline)]">
    <template v-if="myRating">
      <p class="text-[0.75rem] text-[var(--color-text-muted)] mb-1.5">Tu valoración a {{ counterpartName }}</p>
      <RatingStars :model-value="myRating.stars" readonly size="sm" />
      <p v-if="myRating.comment" class="text-[0.8125rem] text-[var(--color-text-muted)] mt-1.5">{{ myRating.comment }}</p>
    </template>

    <template v-else>
      <p class="text-[0.8125rem] font-medium text-[var(--color-text)] mb-2">¿Cómo fue colaborar con {{ counterpartName }}?</p>
      <RatingStars v-model="stars" class="mb-3" />
      <textarea
        v-model="comment" rows="2" maxlength="500" placeholder="Comentario opcional (comunicación, cumplimiento de plazos…)"
        class="w-full px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none resize-none mb-3"
      />
      <BaseButton
        variant="secondary" size="sm" :disabled="!stars || submitting === collaborationId" :icon-spin="submitting === collaborationId"
        @click="send"
      >
        Enviar valoración
      </BaseButton>
      <p v-if="submitError" class="text-[0.75rem] text-[var(--color-status-alert)] mt-2">{{ submitError }}</p>
    </template>
  </div>
</template>

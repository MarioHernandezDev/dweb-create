<script setup lang="ts">
/**
 * Aprobar/pedir cambios a una publicación "Para revisar" — antes solo
 * existía inline dentro de `partner/index.vue` (Inicio → Tu calendario).
 * La misma acción hacía falta también en la pestaña Calendario del detalle
 * de una colaboración (`partner/requests.vue`), que hasta ahora era de
 * solo lectura: si un partner con varias colaboraciones no encontraba la
 * entrega pendiente en la portada de Inicio, no tenía ningún otro sitio
 * desde donde actuar. Mismas RPCs (`approve_post`/`request_post_changes`,
 * vía `usePartnerPosts`), un solo componente para los dos sitios.
 */
/**
 * `contentVersion`: la versión de la publicación que se está viendo. Se envía al servidor,
 * que rechaza la revisión si el creador cambió algo mientras tanto (se aprueba lo que se vio).
 */
import { errorMessage } from '~/utils/error-message'

const props = defineProps<{ postId: string; contentVersion?: number }>()
const emit = defineEmits<{ done: [] }>()

const { approvePost, requestChanges, applyReview, refresh } = usePartnerPosts()

const acting = ref(false)
const stage = ref<'idle' | 'requesting-changes'>('idle')
const changeComment = ref('')
const changeError = ref('')
const showApproveComment = ref(false)
const approveComment = ref('')

async function submitApprove() {
  acting.value = true
  changeError.value = ''
  try {
    await approvePost(props.postId, approveComment.value, props.contentVersion)
    emit('done') // antes de reflejar la fase: al cambiar, este formulario se desmonta y ya no podría avisar
    applyReview(props.postId, 'scheduled')
  } catch (e) {
    changeError.value = errorMessage(e, 'No se ha podido aprobar. Inténtalo de nuevo.')
    await refresh() // la publicación pudo cambiar: se muestra la versión actual
  } finally {
    acting.value = false
  }
}

async function submitChanges() {
  changeError.value = ''
  if (!changeComment.value.trim()) {
    changeError.value = 'Explica qué hay que cambiar.'
    return
  }
  acting.value = true
  try {
    await requestChanges(props.postId, changeComment.value, props.contentVersion)
    emit('done')
    applyReview(props.postId, 'in_production')
  } catch (e) {
    changeError.value = errorMessage(e, 'No se ha podido enviar. Inténtalo de nuevo.')
    await refresh()
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <div>
    <template v-if="stage === 'requesting-changes'">
      <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="review-change-comment">¿Qué hay que cambiar?</label>
      <textarea
        id="review-change-comment" v-model="changeComment" rows="3" placeholder="Sé concreto — esto es justo lo que verá el creador…"
        class="textarea w-full resize-none"
      />
      <p v-if="changeError" class="text-micro text-[var(--color-status-alert)] mt-1.5">{{ changeError }}</p>
      <div class="flex gap-2.5 mt-3">
        <BaseButton variant="secondary" class="flex-1" :disabled="acting" @click="stage = 'idle'">Cancelar</BaseButton>
        <BaseButton variant="primary" class="flex-1" :disabled="acting || !changeComment.trim()" :icon-spin="acting" @click="submitChanges">Enviar</BaseButton>
      </div>
    </template>
    <template v-else>
      <textarea
        v-if="showApproveComment" v-model="approveComment" rows="2" placeholder="Comentario opcional al aprobar…"
        class="textarea w-full resize-none mb-3"
      />
      <button v-else type="button" class="text-micro text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2 mb-3" @click="showApproveComment = true">
        + Añadir un comentario
      </button>
      <p v-if="changeError" class="text-micro text-[var(--color-status-alert)] mb-2" role="alert" data-review-error>{{ changeError }}</p>
      <div class="flex gap-2.5">
        <BaseButton variant="secondary" class="flex-1" icon="ph:arrow-counter-clockwise-bold" :disabled="acting" @click="stage = 'requesting-changes'">Pedir cambios</BaseButton>
        <BaseButton variant="primary" class="flex-1" icon="ph:check-bold" :disabled="acting" :icon-spin="acting" @click="submitApprove">Aprobar</BaseButton>
      </div>
    </template>
  </div>
</template>

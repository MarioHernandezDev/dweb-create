<script setup lang="ts">
/**
 * Diálogo de una decisión de la marca sobre un entregable: renunciar, aceptar sin aprobación
 * formal o reabrir. El motivo es obligatorio (10–500 caracteres) y queda en el historial que ven
 * las dos partes; el servidor lo vuelve a comprobar.
 */
import type { DecisionMode } from '~/composables/useCollabDeliverables'

const props = defineProps<{
  mode: DecisionMode
  deliverableTitle: string
  postTitle?: string | null
  loading?: boolean
  error?: string
}>()
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ submit: [reason: string] }>()

const reason = ref('')
watch(open, (v) => { if (v) reason.value = '' })

const meta = computed(() => ({
  waived: {
    title: 'Renunciar a este entregable',
    body: 'Dejará de contar para poder completar la colaboración. Quedará constancia de tu decisión y de su motivo, y podrás reabrirlo mientras la colaboración siga activa.',
    cta: 'Renunciar al entregable'
  },
  accepted_without_approval: {
    title: 'Aceptar sin aprobación formal',
    body: `Das por buena la versión actual de «${props.postTitle ?? 'la publicación'}» sin pasar por «Aprobar» o «Pedir cambios». Si el creador cambia después algo material (título, texto, imagen, tipo, plataforma o hashtags), esta decisión caduca y habrá que revisarla de nuevo.`,
    cta: 'Aceptar sin aprobación'
  },
  reopen: {
    title: 'Reabrir entregable',
    body: 'Se deshace la decisión anterior. No se borra nada: la decisión y este motivo quedan en el historial.',
    cta: 'Reabrir'
  }
}[props.mode]))

const length = computed(() => reason.value.trim().length)
const valid = computed(() => length.value >= 10 && length.value <= 500)
</script>

<template>
  <BottomSheet v-model="open" :title="meta.title">
    <form class="decision" data-decision-dialog @submit.prevent="valid && emit('submit', reason.trim())">
      <p class="decision__entregable">{{ deliverableTitle }}</p>
      <p class="decision__body">{{ meta.body }}</p>
      <label class="field__label" for="decision-reason">Motivo (obligatorio)</label>
      <textarea id="decision-reason" v-model="reason" class="textarea" rows="4" maxlength="500" placeholder="Explica por qué: lo verán las dos partes." />
      <p class="decision__count" :data-ok="valid">{{ length }}/500 · mínimo 10</p>
      <p v-if="error" class="collab-error" role="alert" data-decision-error>{{ error }}</p>
      <div class="decision__actions">
        <BaseButton variant="ghost" @click="open = false">Cancelar</BaseButton>
        <BaseButton type="submit" :variant="mode === 'reopen' ? 'primary' : 'secondary'" :loading="loading" :disabled="!valid">{{ meta.cta }}</BaseButton>
      </div>
    </form>
  </BottomSheet>
</template>

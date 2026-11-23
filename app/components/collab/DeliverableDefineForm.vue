<script setup lang="ts">
import { errorMessage } from '~/utils/error-message'
/**
 * La marca define los entregables de una colaboración que no tiene (Descubrir, antiguas): una sola
 * vez, uno por línea. Quedan «por confirmar»: no son exigibles hasta que el creador los confirma
 * (la marca no puede añadir obligaciones unilateralmente tras aceptar). El servidor lo comprueba.
 */
const props = defineProps<{ collaborationId: string }>()
const emit = defineEmits<{ changed: [] }>()

const { define, acting } = useCollabDeliverables()
const open = ref(false)
const text = ref('')
const error = ref('')

const titles = computed(() => text.value.split('\n').map((t) => t.trim()).filter(Boolean))
const valid = computed(() => titles.value.length >= 1 && titles.value.length <= 20 && titles.value.every((t) => t.length <= 500))

async function save() {
  if (!valid.value) return
  error.value = ''
  try {
    await define(props.collaborationId, titles.value)
    open.value = false
    text.value = ''
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e, 'No se han podido guardar los entregables.')
  }
}
</script>

<template>
  <div class="define" data-define-deliverables>
    <BaseButton v-if="!open" variant="outline" size="sm" icon="ph:list-checks-bold" @click="open = true">Definir entregables</BaseButton>
    <form v-else class="define__form" @submit.prevent="save">
      <label class="field__label" for="define-titles">Un entregable por línea</label>
      <textarea id="define-titles" v-model="text" class="textarea" rows="4" placeholder="1 reel de 30 s&#10;3 stories" />
      <p class="define__hint">Solo se pueden definir una vez. El creador tendrá que confirmarlos antes de que sean exigibles.</p>
      <p v-if="error" class="collab-error" role="alert">{{ error }}</p>
      <div class="define__actions">
        <BaseButton variant="ghost" size="sm" @click="open = false">Cancelar</BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :loading="acting === `define:${collaborationId}`" :disabled="!valid">Definir</BaseButton>
      </div>
    </form>
  </div>
</template>

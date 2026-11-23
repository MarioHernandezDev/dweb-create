<script setup lang="ts">
import { errorMessage } from '~/utils/error-message'
import type { CollaborationLogKind } from '~/composables/useCollaborationLog'

/**
 * Añadir un apunte (incidencia o cambio acordado) a la cronología. Es el registro
 * compartido de siempre (`collaboration_log_entries`, append-only): el apunte
 * aparece en la cronología porque la base de datos lo copia como evento. Un
 * «cambio acordado» es solo constancia escrita: no modifica ningún dato.
 */
const props = defineProps<{ collaborationId: string }>()
const emit = defineEmits<{ added: [] }>()

const { addEntry } = useCollaborationLog()

const open = ref(false)
const kind = ref<CollaborationLogKind>('incident')
const detail = ref('')
const saving = ref(false)
const error = ref('')
const kinds: { value: CollaborationLogKind; label: string }[] = [
  { value: 'incident', label: 'Incidencia' },
  { value: 'agreed_change', label: 'Cambio acordado' }
]
const canSave = computed(() => detail.value.trim().length > 0 && detail.value.length <= 1000)

function show() { open.value = true; kind.value = 'incident'; detail.value = ''; error.value = '' }

async function save() {
  if (!canSave.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await addEntry(props.collaborationId, kind.value, detail.value)
    open.value = false
    emit('added')
  } catch (e) {
    error.value = errorMessage(e, 'No se ha podido guardar. Inténtalo de nuevo.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="note-form">
    <BaseButton v-if="!open" variant="outline" size="sm" icon="ph:note-pencil-bold" data-add-note @click="show">Añadir apunte</BaseButton>
    <form v-else class="note-form__form" @submit.prevent="save">
      <div class="note-form__kinds" role="group" aria-label="Tipo de apunte">
        <Chip v-for="k in kinds" :key="k.value" size="sm" :selected="kind === k.value" @click="kind = k.value">{{ k.label }}</Chip>
      </div>
      <label class="sr-only" for="note-detail">Apunte</label>
      <textarea id="note-detail" v-model="detail" class="textarea" rows="3" maxlength="1000" :placeholder="kind === 'incident' ? 'Qué ha pasado…' : 'Qué habéis acordado…'" />
      <p v-if="kind === 'agreed_change'" class="note-form__hint">Deja constancia de lo acordado; no cambia ningún dato de la colaboración.</p>
      <div class="note-form__actions">
        <BaseButton variant="ghost" size="sm" @click="open = false">Cancelar</BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :loading="saving" :disabled="!canSave">Guardar</BaseButton>
      </div>
      <p v-if="error" class="collab-error" role="alert">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { TemplateKind } from '~/utils/proposal-templates'
import { errorMessage } from '~/utils/error-message'

/**
 * Barra de plantillas de una propuesta: aplicar una guardada (rellena el formulario, que se puede retocar) y
 * guardar lo que hay escrito como plantilla. El formulario que la usa decide qué datos entran (`current`).
 */
const props = withDefaults(defineProps<{ kind: TemplateKind; current: Record<string, unknown>; applyHint?: string }>(), { applyHint: 'revisa los datos antes de enviar' })
const emit = defineEmits<{ apply: [data: unknown] }>()

const { templates, load, save, remove } = useProposalTemplates(props.kind)
const { confirm } = useConfirm()
const toast = useToast()

const selectedId = ref('')
const naming = ref(false)
const name = ref('')
const busy = ref(false)
const error = ref('')
const selected = computed(() => templates.value.find((t) => t.id === selectedId.value) ?? null)

onMounted(() => load())

function apply() {
  if (!selected.value) return
  emit('apply', selected.value.data)
  toast.success(`Plantilla «${selected.value.name}» aplicada: ${props.applyHint}`)
}
function startNaming() { naming.value = true; name.value = selected.value?.name ?? ''; error.value = '' }

async function saveCurrent() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await save(name.value, props.current)
    toast.success(result === 'updated' ? 'Plantilla actualizada' : 'Plantilla guardada')
    selectedId.value = templates.value.find((t) => t.name.toLowerCase() === name.value.trim().replace(/\s+/g, ' ').toLowerCase())?.id ?? ''
    naming.value = false
  } catch (e) {
    error.value = errorMessage(e, 'No se ha podido guardar la plantilla.')
  } finally {
    busy.value = false
  }
}
async function removeSelected() {
  const t = selected.value
  if (!t || busy.value) return
  if (!(await confirm({ title: '¿Borrar la plantilla?', message: `«${t.name}» dejará de estar disponible. Lo que ya hayas creado con ella no cambia.`, confirmLabel: 'Borrar plantilla' }))) return
  busy.value = true
  error.value = ''
  try {
    await remove(t.id)
    selectedId.value = ''
    toast.success('Plantilla borrada')
  } catch (e) {
    error.value = errorMessage(e, 'No se ha podido borrar la plantilla.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="ptpl" data-proposal-templates>
    <div v-if="!naming" class="ptpl__row">
      <template v-if="templates.length">
        <label class="sr-only" :for="`ptpl-${kind}`">Plantilla</label>
        <select :id="`ptpl-${kind}`" v-model="selectedId" class="input ptpl__select" @change="apply">
          <option value="">Usar una plantilla…</option>
          <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <IconButton v-if="selected" icon="ph:trash-bold" :label="`Borrar la plantilla ${selected.name}`" size="sm" :disabled="busy" @click="removeSelected" />
      </template>
      <BaseButton variant="ghost" size="sm" icon="ph:floppy-disk-bold" data-template-save @click="startNaming">Guardar como plantilla</BaseButton>
    </div>
    <form v-else class="ptpl__row" @submit.prevent="saveCurrent">
      <label class="sr-only" :for="`ptpl-name-${kind}`">Nombre de la plantilla</label>
      <input :id="`ptpl-name-${kind}`" v-model="name" class="input ptpl__select" maxlength="80" placeholder="Nombre: p. ej. Pack 3 reels" autocomplete="off">
      <BaseButton variant="ghost" size="sm" @click="naming = false">Cancelar</BaseButton>
      <BaseButton type="submit" variant="primary" size="sm" :loading="busy" :disabled="!name.trim()">Guardar</BaseButton>
    </form>
    <p v-if="naming" class="ptpl__hint">Se guarda lo que hay ahora en el formulario. Con un nombre que ya existe, se actualiza esa plantilla.</p>
    <p v-if="error" class="collab-error" role="alert">{{ error }}</p>
  </div>
</template>

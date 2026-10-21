<script setup lang="ts">
import type { Package } from '~/composables/usePackages'
import type { Role } from '~/types'

const props = defineProps<{ modelValue: boolean; profileId: string; role: Role; editing?: Package | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()

const { saving, createPackage, updatePackage } = usePackages()

const title = ref('')
const description = ref('')
const priceEuros = ref<number | null>(null)
const deliverablesText = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    title.value = props.editing?.title ?? ''
    description.value = props.editing?.description ?? ''
    priceEuros.value = props.editing ? props.editing.priceCents / 100 : null
    deliverablesText.value = props.editing?.deliverables.join('\n') ?? ''
  }
)

const sheetTitle = computed(() => {
  if (props.editing) return props.role === 'creator' ? 'Editar paquete' : 'Editar necesidad'
  return props.role === 'creator' ? 'Nuevo paquete' : 'Nueva necesidad'
})

async function save() {
  if (!title.value || !priceEuros.value) return
  const deliverables = deliverablesText.value.split('\n').map((d) => d.trim()).filter(Boolean)

  if (props.editing) {
    await updatePackage(props.editing.id, {
      title: title.value,
      description: description.value || null,
      priceCents: Math.round(priceEuros.value * 100),
      deliverables
    })
  } else {
    await createPackage({
      profileId: props.profileId,
      title: title.value,
      description: description.value || null,
      priceCents: Math.round(priceEuros.value * 100),
      deliverables
    })
  }
  emit('saved')
  emit('update:modelValue', false)
}
</script>

<template>
  <BottomSheet :model-value="modelValue" :title="sheetTitle" @update:model-value="$emit('update:modelValue', $event)">
    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pkg-title">Título</label>
    <input
      id="pkg-title" v-model="title" type="text" :placeholder="role === 'creator' ? 'Ej. 1 Reel + 3 Stories' : 'Ej. Lanzamiento de producto'"
      class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 mb-4"
    >

    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pkg-description">Descripción</label>
    <textarea
      id="pkg-description" v-model="description" rows="3" placeholder="Qué incluye…"
      class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none mb-4"
    />

    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pkg-deliverables">Entregables (uno por línea)</label>
    <textarea
      id="pkg-deliverables" v-model="deliverablesText" rows="3" placeholder="Ej.&#10;1 Reel&#10;3 Stories"
      class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none mb-4"
    />

    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pkg-price">{{ role === 'creator' ? 'Precio (€)' : 'Presupuesto (€)' }}</label>
    <input
      id="pkg-price" v-model.number="priceEuros" type="number" min="1" step="1" placeholder="Ej. 300"
      class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
    >

    <BaseButton variant="primary" size="lg" class="w-full mt-5" :icon-spin="saving" :disabled="!title || !priceEuros || saving" @click="save">
      {{ saving ? 'Guardando…' : 'Guardar' }}
    </BaseButton>
  </BottomSheet>
</template>

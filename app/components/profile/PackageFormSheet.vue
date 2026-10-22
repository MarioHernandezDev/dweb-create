<script setup lang="ts">
import type { Package } from '~/composables/usePackages'
import type { Role } from '~/types'

const props = defineProps<{ modelValue: boolean; profileId: string; role: Role; editing?: Package | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()

const { saving, createPackage, updatePackage, uploadPackageCover } = usePackages()

const title = ref('')
const description = ref('')
const priceEuros = ref<number | null>(null)
const deliverables = ref<string[]>([])
const deliverableInput = ref('')
const errorMsg = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    title.value = props.editing?.title ?? ''
    description.value = props.editing?.description ?? ''
    priceEuros.value = props.editing ? props.editing.priceCents / 100 : null
    deliverables.value = props.editing ? [...props.editing.deliverables] : []
    deliverableInput.value = ''
    errorMsg.value = ''
  }
)

function addDeliverable() {
  const v = deliverableInput.value.trim()
  if (v && !deliverables.value.includes(v)) deliverables.value.push(v)
  deliverableInput.value = ''
}
function onDeliverableKeydown(e: KeyboardEvent) {
  if (e.key === ',') {
    e.preventDefault()
    addDeliverable()
  } else if (e.key === 'Backspace' && !deliverableInput.value && deliverables.value.length) {
    deliverables.value.pop()
  }
}

const sheetTitle = computed(() => {
  if (props.editing) return props.role === 'creator' ? 'Editar paquete' : 'Editar necesidad'
  return props.role === 'creator' ? 'Nuevo paquete' : 'Nueva necesidad'
})

// La portada solo se puede subir editando un paquete que ya existe (hace
// falta su id para la ruta en Storage) — mismo criterio que la portada de
// un post del tablero, que tampoco se pide al crear.
const coverInputEl = ref<HTMLInputElement | null>(null)
const coverUploading = ref(false)
const coverError = ref('')
async function onCoverChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !props.editing) return
  coverError.value = ''
  coverUploading.value = true
  try {
    const url = await uploadPackageCover(props.editing.id, file)
    if (props.editing) props.editing.coverUrl = url
  } catch (err) {
    console.error('[PackageFormSheet] fallo al subir la portada:', err)
    coverError.value = 'No se ha podido subir. Prueba con otra imagen (JPG/PNG/WebP).'
  } finally {
    coverUploading.value = false
  }
}

async function save() {
  if (!title.value || !priceEuros.value) return
  errorMsg.value = ''
  addDeliverable()

  try {
    if (props.editing) {
      await updatePackage(props.editing.id, {
        title: title.value,
        description: description.value || null,
        priceCents: Math.round(priceEuros.value * 100),
        deliverables: deliverables.value
      })
    } else {
      await createPackage({
        profileId: props.profileId,
        title: title.value,
        description: description.value || null,
        priceCents: Math.round(priceEuros.value * 100),
        deliverables: deliverables.value
      })
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.'
  }
}
</script>

<template>
  <BottomSheet :model-value="modelValue" :title="sheetTitle" @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="editing" class="mb-4">
      <button
        type="button"
        class="group relative h-28 w-full rounded-[var(--radius-md)] overflow-hidden flex items-center justify-center bg-[var(--color-ink-overlay)]"
        :disabled="coverUploading"
        @click="coverInputEl?.click()"
      >
        <img v-if="editing.coverUrl" :src="editing.coverUrl" alt="" class="absolute inset-0 size-full object-cover">
        <Icon v-else name="ph:image-fill" class="size-7 text-[var(--color-text-faint)]" />
        <div
          class="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 text-white opacity-0 transition-[background-color,opacity] duration-200"
          :class="coverUploading ? 'bg-black/45 opacity-100' : 'group-hover:bg-black/45 group-hover:opacity-100'"
        >
          <Icon :name="coverUploading ? 'ph:circle-notch-bold' : 'ph:camera-plus-fill'" class="size-5" :class="coverUploading && 'animate-spin'" />
          <span class="text-[0.8125rem] font-medium">{{ coverUploading ? 'Subiendo…' : editing.coverUrl ? 'Cambiar portada' : 'Añadir portada' }}</span>
        </div>
      </button>
      <input ref="coverInputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onCoverChange">
      <p v-if="coverError" class="text-[0.75rem] text-[var(--color-status-alert)] mt-1.5">{{ coverError }}</p>
    </div>

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

    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pkg-deliverables">Entregables</label>
    <div class="w-full px-2.5 py-2 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] mb-4 flex flex-wrap gap-1.5 items-center focus-within:border-[var(--color-primary-500)]/60">
      <span
        v-for="(d, i) in deliverables" :key="i"
        class="inline-flex items-center gap-1 pl-2.5 pr-1.5 h-7 rounded-full bg-[var(--color-ink-raised)] border border-[var(--color-hairline-strong)] text-[0.8125rem] text-[var(--color-text)]"
      >
        {{ d }}
        <button type="button" aria-label="Quitar" class="size-4 flex items-center justify-center rounded-full hover:bg-[var(--color-hairline-strong)]" @click="deliverables.splice(i, 1)">
          <Icon name="ph:x-bold" class="size-2.5" />
        </button>
      </span>
      <input
        id="pkg-deliverables" v-model="deliverableInput" type="text" placeholder="Escribe uno y pulsa Enter…"
        class="flex-1 min-w-[8rem] h-7 bg-transparent text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
        @keydown.enter.prevent="addDeliverable" @keydown="onDeliverableKeydown" @blur="addDeliverable"
      >
    </div>

    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pkg-price">{{ role === 'creator' ? 'Precio (€)' : 'Presupuesto (€)' }}</label>
    <input
      id="pkg-price" v-model.number="priceEuros" type="number" min="1" step="1" placeholder="Ej. 300"
      class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
    >

    <p v-if="errorMsg" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-3">{{ errorMsg }}</p>

    <BaseButton variant="primary" size="lg" class="w-full mt-5" :icon-spin="saving" :disabled="!title || !priceEuros || saving" @click="save">
      {{ saving ? 'Guardando…' : 'Guardar' }}
    </BaseButton>
  </BottomSheet>
</template>

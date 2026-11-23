<script setup lang="ts">
import { isFileTooLarge, resizeImageFile } from '~/utils/image'
import { formatFileSize } from '~/utils/collab-files'

/**
 * Controles para cambiar la foto de portada, encima de la propia portada de la
 * cabecera del perfil (antes había un segundo selector duplicado dentro del
 * formulario de la ficha). La subida real la hace quien lo usa (`upload`).
 * Dos botones de texto —siempre visibles, también en móvil, sin depender del
 * «hover»— y un mensaje de error discreto si algo falla.
 */
const props = defineProps<{
  coverUrl: string | null
  upload: (file: File) => Promise<string>
  remove?: () => Promise<void>
}>()

const MAX_DIMENSION = 1600

const { confirm } = useConfirm()
const inputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const removing = ref(false)
const error = ref('')

async function onChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  if (isFileTooLarge(file)) {
    error.value = `Esa imagen pesa ${formatFileSize(file.size)}: prueba con una de menos de 20 MB.`
    if (inputEl.value) inputEl.value.value = ''
    return
  }
  uploading.value = true
  try {
    const resized = await resizeImageFile(file, MAX_DIMENSION)
    await props.upload(resized)
  } catch (err) {
    console.error('[ProfileCoverEdit] fallo al subir la portada:', err)
    error.value = 'No se ha podido subir. Prueba con otra imagen (JPG, PNG o WebP).'
  } finally {
    uploading.value = false
    if (inputEl.value) inputEl.value.value = ''
  }
}

async function onRemove() {
  if (!props.remove) return
  const ok = await confirm({ title: '¿Quitar la foto de portada?', confirmLabel: 'Quitar', tone: 'danger', icon: 'ph:trash-fill' })
  if (!ok) return
  error.value = ''
  removing.value = true
  try {
    await props.remove()
  } catch (err) {
    console.error('[ProfileCoverEdit] fallo al quitar la portada:', err)
    error.value = 'No se ha podido quitar la foto.'
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <div class="cover-edit" data-cover-edit>
    <p v-if="error" class="cover-edit__error" role="alert">{{ error }}</p>
    <div class="cover-edit__buttons">
      <button type="button" class="cover-edit__btn" data-cover-change :disabled="uploading || removing" @click="inputEl?.click()">
        <Icon :name="uploading ? 'ph:circle-notch-bold' : 'ph:camera-plus-fill'" class="size-4" :class="uploading && 'animate-spin'" />
        {{ uploading ? 'Subiendo…' : coverUrl ? 'Cambiar portada' : 'Añadir portada' }}
      </button>
      <button v-if="coverUrl && remove" type="button" class="cover-edit__btn cover-edit__btn--icon" aria-label="Quitar la foto de portada" :disabled="removing || uploading" @click="onRemove">
        <Icon name="ph:trash-bold" class="size-4" />
      </button>
    </div>
    <input ref="inputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onChange">
  </div>
</template>

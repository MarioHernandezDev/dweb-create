<script setup lang="ts">
import { isFileTooLarge, formatFileSize, resizeImageFile } from '~/utils/image'

/**
 * Botón grande de foto de portada — mismo patrón visual que
 * `timeline/CoverUploader.vue` (degradado + icono si no hay foto, la foto
 * si la hay, overlay de "Cambiar foto" al pasar el ratón), pero genérico:
 * la subida real la hace quien lo usa (prop `upload`), no está atado a
 * `useMyPosts`. Usado en `creator/profile.vue`/`partner/profile.vue` para
 * la foto que luego se ve grande en las cards de "Descubrir".
 */
const props = defineProps<{
  coverUrl: string | null
  coverArt: { from: string; to: string; angle: number }
  icon: string
  upload: (file: File) => Promise<string>
  remove?: () => Promise<void>
}>()

const emit = defineEmits<{ 'update:coverUrl': [url: string | null] }>()

const { confirm } = useConfirm()
const inputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const removing = ref(false)
const error = ref('')

// Más ancha que un avatar (banner a todo lo ancho), pero sigue sin hacer
// falta la resolución completa de una foto de móvil — ver utils/image.ts.
const MAX_DIMENSION = 1600

async function onChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  error.value = ''
  if (isFileTooLarge(file)) {
    error.value = `Esa imagen pesa ${formatFileSize(file.size)} — prueba con una de menos de 20 MB.`
    if (inputEl.value) inputEl.value.value = ''
    return
  }

  uploading.value = true
  try {
    const resized = await resizeImageFile(file, MAX_DIMENSION)
    const url = await props.upload(resized)
    emit('update:coverUrl', url)
  } catch (err) {
    console.error('[CoverPhotoUploader] fallo al subir la foto:', err)
    error.value = 'No se ha podido subir. Prueba con otra imagen (JPG/PNG/WebP).'
  } finally {
    uploading.value = false
    if (inputEl.value) inputEl.value.value = ''
  }
}

async function onRemove() {
  if (!props.remove) return
  const ok = await confirm({ title: '¿Quitar foto de portada?', confirmLabel: 'Quitar', tone: 'danger', icon: 'ph:trash-fill' })
  if (!ok) return

  error.value = ''
  removing.value = true
  try {
    await props.remove()
    emit('update:coverUrl', null)
  } catch (err) {
    console.error('[CoverPhotoUploader] fallo al quitar la foto:', err)
    error.value = 'No se ha podido quitar la foto.'
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <div>
    <div class="relative">
      <button
        type="button"
        class="group relative h-40 w-full rounded-[var(--radius-lg)] overflow-hidden flex items-center justify-center"
        :style="!coverUrl ? { background: `linear-gradient(${coverArt.angle}deg, ${coverArt.from}, ${coverArt.to})` } : undefined"
        :disabled="uploading || removing"
        @click="inputEl?.click()"
      >
        <img v-if="coverUrl" :src="coverUrl" alt="" class="absolute inset-0 size-full object-cover">
        <Icon v-else :name="icon" class="size-10 text-white/90" />

        <div
          class="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 text-white opacity-0 transition-[background-color,opacity] duration-200"
          :class="uploading ? 'bg-black/45 opacity-100' : 'group-hover:bg-black/45 group-hover:opacity-100'"
        >
          <Icon :name="uploading ? 'ph:circle-notch-bold' : 'ph:camera-plus-fill'" class="size-5" :class="uploading && 'animate-spin'" />
          <span class="text-[0.8125rem] font-medium">{{ uploading ? 'Subiendo…' : coverUrl ? 'Cambiar foto de portada' : 'Añadir foto de portada' }}</span>
        </div>
      </button>

      <button
        v-if="coverUrl && remove" type="button" aria-label="Quitar foto de portada"
        class="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/35 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
        :disabled="removing" @click="onRemove"
      >
        <Icon name="ph:x-bold" class="size-3.5" />
      </button>
    </div>

    <input ref="inputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onChange">

    <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-2">{{ error }}</p>
  </div>
</template>

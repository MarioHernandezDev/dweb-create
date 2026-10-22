<script setup lang="ts">
import { isFileTooLarge, formatFileSize, resizeImageFile } from '~/utils/image'

/**
 * Foto de perfil circular editable — mismo patrón de interacción que
 * CoverPhotoUploader.vue (overlay de "Cambiar foto" al pasar el ratón) pero
 * redonda, con BaseAvatar (iniciales + matiz) como estado "sin foto" en vez
 * de un degradado. Usada en creator/profile.vue y partner/profile.vue.
 */
const props = defineProps<{
  avatarUrl: string | null
  initials: string
  hue: number
  upload: (file: File) => Promise<string>
}>()

const emit = defineEmits<{ 'update:avatarUrl': [url: string] }>()

const inputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref('')

// Un avatar nunca se ve a más de unos pocos cm de lado — se redimensiona en
// el navegador antes de subir (ver utils/image.ts), así una foto de móvil
// de varios MB no viaja entera para mostrarse del tamaño de un círculo.
const MAX_DIMENSION = 800

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
    emit('update:avatarUrl', url)
  } catch (err) {
    console.error('[AvatarUploader] fallo al subir la foto:', err)
    error.value = 'No se ha podido subir. Prueba con otra imagen (JPG/PNG/WebP).'
  } finally {
    uploading.value = false
    if (inputEl.value) inputEl.value.value = ''
  }
}
</script>

<template>
  <div>
    <button type="button" class="group relative size-16 rounded-full shrink-0" :disabled="uploading" @click="inputEl?.click()">
      <BaseAvatar :initials="initials" :src="avatarUrl" :hue="hue" size="lg" />

      <div
        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-[background-color,opacity] duration-200"
        :class="uploading ? 'bg-black/45 opacity-100' : 'group-hover:bg-black/45 group-hover:opacity-100'"
      >
        <Icon :name="uploading ? 'ph:circle-notch-bold' : 'ph:camera-plus-fill'" class="size-5" :class="uploading && 'animate-spin'" />
      </div>
    </button>

    <input ref="inputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onChange">

    <p v-if="error" class="text-[0.75rem] text-[var(--color-status-alert)] mt-1.5 max-w-[11rem]">{{ error }}</p>
  </div>
</template>

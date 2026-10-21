<script setup lang="ts">
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
}>()

const emit = defineEmits<{ 'update:coverUrl': [url: string] }>()

const inputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref('')

async function onChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploading.value = true
  error.value = ''
  try {
    const url = await props.upload(file)
    emit('update:coverUrl', url)
  } catch (err) {
    console.error('[CoverPhotoUploader] fallo al subir la foto:', err)
    error.value = 'No se ha podido subir. Prueba con otra imagen (JPG/PNG/WebP, máx. 8MB).'
  } finally {
    uploading.value = false
    if (inputEl.value) inputEl.value.value = ''
  }
}
</script>

<template>
  <div>
    <button
      type="button"
      class="group relative h-40 w-full rounded-[var(--radius-lg)] overflow-hidden flex items-center justify-center"
      :style="!coverUrl ? { background: `linear-gradient(${coverArt.angle}deg, ${coverArt.from}, ${coverArt.to})` } : undefined"
      :disabled="uploading"
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

    <input ref="inputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onChange">

    <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-2">{{ error }}</p>
  </div>
</template>

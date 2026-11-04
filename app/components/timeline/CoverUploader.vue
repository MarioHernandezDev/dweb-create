<script setup lang="ts">
import type { CoverArt } from '~/types'

const props = defineProps<{
  postId: string
  mediaUrl?: string | null
  cover: CoverArt
  icon: string
}>()

const emit = defineEmits<{ 'update:mediaUrl': [url: string] }>()

const { uploadCover, posts, refresh } = useMyPosts()
const { confirm } = useConfirm()
const inputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref('')

async function onChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // Cambiar la imagen de una pieza ya aprobada de una colaboración invalida la aprobación (Fase 2).
  const current = posts.value.find((p) => p.id === props.postId)
  const invalidatesApproval = current?.status === 'scheduled' && !!current.collaborationId
  if (invalidatesApproval) {
    const ok = await confirm({
      title: 'Esta publicación ya está aprobada',
      message: 'Si cambias la imagen, la marca tendrá que aprobarla de nuevo: volverá a «En producción».',
      confirmLabel: 'Cambiar y pedir nueva aprobación'
    })
    if (!ok) {
      if (inputEl.value) inputEl.value.value = ''
      return
    }
  }

  uploading.value = true
  error.value = ''
  try {
    const url = await uploadCover(props.postId, file)
    emit('update:mediaUrl', url)
    if (invalidatesApproval) await refresh()
  } catch (err) {
    console.error('[CoverUploader] fallo al subir la foto:', err)
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
      :style="!mediaUrl ? { background: `linear-gradient(${cover.angle}deg, ${cover.from}, ${cover.to})` } : undefined"
      :disabled="uploading"
      @click="inputEl?.click()"
    >
      <img v-if="mediaUrl" :src="mediaUrl" alt="" class="absolute inset-0 size-full object-cover">
      <Icon v-else :name="icon" class="size-10 text-white/90" />

      <div
        class="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 text-white opacity-0 transition-[background-color,opacity] duration-200"
        :class="uploading ? 'bg-black/45 opacity-100' : 'group-hover:bg-black/45 group-hover:opacity-100'"
      >
        <Icon :name="uploading ? 'ph:circle-notch-bold' : 'ph:camera-plus-fill'" class="size-5" :class="uploading && 'animate-spin'" />
        <span class="text-sm font-medium">{{ uploading ? 'Subiendo…' : mediaUrl ? 'Cambiar foto' : 'Añadir foto' }}</span>
      </div>
    </button>

    <input ref="inputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onChange">

    <p v-if="error" class="text-sm text-[var(--color-status-alert)] mt-2">{{ error }}</p>
  </div>
</template>

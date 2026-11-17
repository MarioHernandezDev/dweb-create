<script setup lang="ts">
import type { CoverArt } from '~/types'

/**
 * Imagen de la publicación. Un marco vertical (4:5, como se ve en Instagram) de tamaño contenido, no una banda a todo
 * el ancho: con foto la muestra entera; sin ella es una zona de «añadir imagen» con arrastrar y soltar. La acción
 * sigue siendo la misma de siempre (subir, con la confirmación de volver a pedir aprobación si ya estaba aprobada).
 */
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
const dragging = ref(false)
const error = ref('')

async function handleFile(file: File | undefined) {
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
function onChange(event: Event) { handleFile((event.target as HTMLInputElement).files?.[0]) }
function onDrop(event: DragEvent) { dragging.value = false; handleFile(event.dataTransfer?.files?.[0]) }
</script>

<template>
  <div class="cover" data-cover-uploader>
    <button
      type="button" class="cover__frame" :class="[mediaUrl ? 'cover__frame--filled' : 'cover__frame--empty', dragging && 'is-dragging']"
      :disabled="uploading" :aria-label="mediaUrl ? 'Cambiar la imagen de la publicación' : 'Añadir una imagen a la publicación'"
      @click="inputEl?.click()" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop"
    >
      <img v-if="mediaUrl" :src="mediaUrl" alt="" class="cover__img">
      <span v-else class="cover__empty">
        <span class="cover__icon"><Icon :name="icon" class="size-6" /></span>
        <strong>Añade una imagen</strong>
        <small>Arrástrala aquí o pulsa para elegirla</small>
        <small class="cover__hint">JPG, PNG o WebP · máx. 8 MB</small>
      </span>

      <span class="cover__overlay" :data-busy="uploading">
        <Icon :name="uploading ? 'ph:circle-notch-bold' : 'ph:camera-plus-fill'" class="size-5" :class="uploading && 'animate-spin'" />
        {{ uploading ? 'Subiendo…' : mediaUrl ? 'Cambiar imagen' : 'Elegir imagen' }}
      </span>
    </button>

    <input ref="inputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onChange">

    <p v-if="error" class="cover__error" role="alert">{{ error }}</p>
  </div>
</template>

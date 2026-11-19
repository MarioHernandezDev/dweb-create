<script setup lang="ts">
import type { CollabFile } from '~/composables/useCollabFiles'
import { COLLAB_FILE_ACCEPT, COLLAB_FILE_MAX_COUNT, fileIcon, formatFileSize } from '~/utils/collab-files'
import { relativeTime } from '~/utils/status'
import { errorMessage } from '~/utils/error-message'

/**
 * Archivos compartidos de la colaboración: guías de marca, material de producto, facturas… Solo los ven las dos
 * partes. Se puede subir mientras la colaboración está abierta; cada cual borra solo lo que subió.
 */
const props = defineProps<{ collaborationId: string; open: boolean; myProfileId: string | null; counterpartName: string }>()
const emit = defineEmits<{ changed: [] }>()

const { files, loaded, loadError, load, upload, remove, signedUrl } = useCollabFiles(props.collaborationId)
const { confirm } = useConfirm()
const toast = useToast()
const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const busyId = ref<string | null>(null)
const error = ref('')

onMounted(load)

async function onPick(e: Event) {
  const target = e.target as HTMLInputElement
  const picked = [...(target.files ?? [])]
  target.value = ''
  if (!picked.length || uploading.value) return
  uploading.value = true
  error.value = ''
  let done = 0
  try {
    // Un archivo que falla (tamaño, tipo) no impide subir los demás.
    const failed: string[] = []
    for (const f of picked) {
      try {
        await upload(f)
        done += 1
      } catch (e2) {
        failed.push(`${f.name}: ${errorMessage(e2, 'no se ha podido subir.')}`)
      }
    }
    error.value = failed.join(' · ')
  } finally {
    uploading.value = false
    if (done) {
      toast.success(done === 1 ? 'Archivo subido' : `${done} archivos subidos`)
      emit('changed')
    }
  }
}

async function download(f: CollabFile) {
  if (busyId.value) return
  busyId.value = f.id
  error.value = ''
  try {
    const url = await signedUrl(f)
    const a = document.createElement('a')
    a.href = url
    a.download = f.name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (e2) {
    error.value = errorMessage(e2, 'No se ha podido abrir el archivo.')
  } finally {
    busyId.value = null
  }
}

async function removeFile(f: CollabFile) {
  const ok = await confirm({ title: '¿Borrar este archivo?', message: `«${f.name}» dejará de estar disponible para ${props.counterpartName}. Quedará constancia en la cronología.`, confirmLabel: 'Borrar archivo' })
  if (!ok) return
  busyId.value = f.id
  error.value = ''
  try {
    await remove(f)
    toast.success('Archivo borrado')
    emit('changed')
  } catch (e2) {
    error.value = errorMessage(e2, 'No se ha podido borrar el archivo.')
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="cfiles" data-collab-files>
    <div v-if="!loaded && !loadError" aria-busy="true"><SkeletonBlock height="3rem" rounded="var(--radius-md)" /></div>
    <p v-else-if="loadError" class="collab-error" role="alert">{{ loadError }} <button type="button" class="cfiles__retry" @click="load">Reintentar</button></p>
    <template v-else>
      <p v-if="!files.length" class="cfiles__empty">
        {{ open ? `Todavía no hay archivos. Sube guías de marca, material de producto o cualquier documento que ${counterpartName} deba ver.` : 'No se compartió ningún archivo en esta colaboración.' }}
      </p>
      <ul v-else class="cfiles__list">
        <li v-for="f in files" :key="f.id" class="cfiles__item">
          <Icon :name="fileIcon(f.mime)" class="cfiles__icon size-5" />
          <span class="cfiles__main">
            <span class="cfiles__name" :title="f.name">{{ f.name }}</span>
            <span class="cfiles__meta">{{ formatFileSize(f.sizeBytes) }} · {{ f.uploaderProfileId === myProfileId ? 'Tú' : counterpartName }} · {{ relativeTime(f.createdAt) }}</span>
          </span>
          <IconButton icon="ph:download-simple-bold" :label="`Descargar ${f.name}`" size="sm" :disabled="busyId === f.id" @click="download(f)" />
          <IconButton v-if="open && f.uploaderProfileId === myProfileId" icon="ph:trash-bold" :label="`Borrar ${f.name}`" size="sm" :disabled="busyId === f.id" @click="removeFile(f)" />
        </li>
      </ul>
      <div v-if="open" class="cfiles__add">
        <input ref="input" type="file" class="sr-only" multiple :accept="COLLAB_FILE_ACCEPT" tabindex="-1" aria-hidden="true" @change="onPick">
        <BaseButton variant="outline" size="sm" icon="ph:upload-simple-bold" :loading="uploading" :disabled="files.length >= COLLAB_FILE_MAX_COUNT" data-upload-file @click="input?.click()">
          {{ uploading ? 'Subiendo…' : 'Subir archivo' }}
        </BaseButton>
        <span class="cfiles__hint">PDF, imágenes y documentos de hasta 10 MB · {{ files.length }}/{{ COLLAB_FILE_MAX_COUNT }}</span>
      </div>
      <p v-if="error" class="collab-error" role="alert">{{ error }}</p>
    </template>
  </div>
</template>

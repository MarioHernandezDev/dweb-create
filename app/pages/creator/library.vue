<script setup lang="ts">
import { errorMessage } from '~/utils/error-message'
import { filterLibrary, humanSize, LIBRARY_ACCEPT, LIBRARY_MAX_FILES, normalizeTags, tagCounts, type LibraryItem } from '~/utils/media-library'

// Biblioteca de archivos del creador: imágenes reutilizables (portadas de publicaciones y de paquetes).
useHead({ title: 'Biblioteca' })

const { items, loaded, loading, uploading, error, load, upload, updateMeta, removeWithUndo } = useMediaLibrary()
const toast = useToast()
await load()

const query = ref('')
const tag = ref<string | null>(null)
const visible = computed(() => filterLibrary(items.value, query.value, tag.value))
const tags = computed(() => tagCounts(items.value))
const inputEl = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const uploadErrors = ref<string[]>([])

async function addFiles(list: FileList | File[] | null | undefined) {
  const files = Array.from(list ?? [])
  if (!files.length || uploading.value) return
  uploadErrors.value = []
  const { added, errors } = await upload(files)
  uploadErrors.value = errors
  if (added) toast.success(added === 1 ? 'Imagen subida a tu biblioteca' : `${added} imágenes subidas a tu biblioteca`)
  if (inputEl.value) inputEl.value.value = ''
}
const onPick = (e: Event) => addFiles((e.target as HTMLInputElement).files)
function onDrop(e: DragEvent) { dragging.value = false; addFiles(e.dataTransfer?.files) }

// Editar nombre y etiquetas.
const editing = ref<LibraryItem | null>(null)
const editOpen = ref(false)
const editName = ref('')
const editTags = ref('')
const editBusy = ref(false)
const editError = ref('')
function startEdit(item: LibraryItem) {
  editing.value = item
  editName.value = item.name
  editTags.value = item.tags.map((t) => `#${t}`).join(' ')
  editError.value = ''
  editOpen.value = true
}
async function saveEdit() {
  if (!editing.value || editBusy.value) return
  editBusy.value = true
  editError.value = ''
  try {
    await updateMeta(editing.value.id, { name: editName.value, tags: normalizeTags(editTags.value.replace(/#/g, ',')) })
    toast.success('Cambios guardados')
    editOpen.value = false
  } catch (e) {
    editError.value = errorMessage(e, 'No se han podido guardar los cambios.')
  } finally {
    editBusy.value = false
  }
}
</script>

<template>
  <AppShell role="creator" title="Biblioteca" subtitle="Tus imágenes, listas para reutilizar como portada">
    <div class="lib" data-library>
      <div class="lib__bar">
        <label class="sr-only" for="lib-q">Buscar en la biblioteca</label>
        <input id="lib-q" v-model="query" type="search" class="input lib__search" placeholder="Buscar por nombre o etiqueta…" autocomplete="off">
        <span class="lib__count" data-library-count>{{ items.length }} de {{ LIBRARY_MAX_FILES }}</span>
        <BaseButton variant="primary" icon="ph:upload-simple-bold" :loading="uploading" :disabled="uploading || items.length >= LIBRARY_MAX_FILES" data-library-upload @click="inputEl?.click()">
          {{ uploading ? 'Subiendo…' : 'Subir imágenes' }}
        </BaseButton>
        <input ref="inputEl" type="file" multiple :accept="LIBRARY_ACCEPT" class="hidden" @change="onPick">
      </div>

      <div v-if="tags.length" class="lib__tags" role="group" aria-label="Filtrar por etiqueta">
        <button v-for="t in tags" :key="t.tag" type="button" class="lib__tag" :aria-pressed="tag === t.tag" @click="tag = tag === t.tag ? null : t.tag">#{{ t.tag }} <small>{{ t.count }}</small></button>
      </div>

      <ul v-if="uploadErrors.length" class="lib__errors" role="alert" data-upload-errors>
        <li v-for="e in uploadErrors" :key="e">{{ e }}</li>
      </ul>

      <p v-if="error" class="lib__msg" role="alert">{{ error }} <button type="button" class="underline font-semibold" @click="load(true)">Reintentar</button></p>

      <div v-else-if="loading && !loaded" class="lib__grid"><SkeletonBlock v-for="n in 8" :key="n" height="11rem" rounded="var(--radius-md)" /></div>

      <div
        v-else class="lib__drop" :class="dragging && 'is-dragging'"
        @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop"
      >
        <EmptyState v-if="!items.length" icon="ph:images" mascot="swim" title="Aún no hay imágenes" description="Sube las que usas a menudo (JPG, PNG o WebP, hasta 8 MB) o suéltalas aquí. Luego las eliges de portada con un toque.">
          <BaseButton variant="primary" size="sm" icon="ph:upload-simple-bold" :loading="uploading" @click="inputEl?.click()">Subir imágenes</BaseButton>
        </EmptyState>
        <p v-else-if="!visible.length" class="lib__msg" role="status">Ninguna imagen coincide con la búsqueda.</p>
        <ul v-else class="lib__grid">
          <li v-for="i in visible" :key="i.id" class="lib__tile" data-library-item>
            <div class="lib__thumb"><SmartImage :src="i.url" :width="360" :height="270" class="lib__img" /></div>
            <div class="lib__meta">
              <p class="lib__name" :title="i.name">{{ i.name }}</p>
              <p class="lib__sub">{{ humanSize(i.sizeBytes) }}<template v-if="i.tags.length"> · {{ i.tags.map((t) => `#${t}`).join(' ') }}</template></p>
            </div>
            <div class="lib__actions">
              <IconButton icon="ph:pencil-simple-bold" :label="`Editar nombre y etiquetas de ${i.name}`" size="sm" @click="startEdit(i)" />
              <a :href="i.url" target="_blank" rel="noopener noreferrer" class="icon-link" :aria-label="`Abrir ${i.name} en otra pestaña`" :title="'Abrir en otra pestaña'"><Icon name="ph:arrow-square-out-bold" class="size-4" /></a>
              <IconButton icon="ph:trash-bold" :label="`Borrar ${i.name}`" size="sm" @click="removeWithUndo(i)" />
            </div>
          </li>
        </ul>
        <p v-if="items.length" class="lib__hint">Suelta imágenes aquí para añadirlas. Se optimizan al subir para que ocupen poco. Para usar una como portada, ábrela desde la publicación o el paquete («Elegir de la biblioteca»).</p>
      </div>
    </div>

    <BottomSheet v-model="editOpen" title="Nombre y etiquetas">
      <form class="grid gap-4" data-library-edit @submit.prevent="saveEdit">
        <BaseField label="Nombre" v-slot="f"><BaseInput v-bind="f" v-model="editName" maxlength="120" /></BaseField>
        <BaseField label="Etiquetas" hint="Separadas por espacios o comas; hasta 8. Sirven para encontrarla luego." v-slot="f">
          <BaseInput v-bind="f" v-model="editTags" placeholder="#otoño #producto" autocomplete="off" />
        </BaseField>
        <p v-if="editError" class="text-sm text-[var(--color-danger)]" role="alert">{{ editError }}</p>
        <div class="flex gap-2 justify-end">
          <BaseButton variant="ghost" type="button" @click="editOpen = false">Cancelar</BaseButton>
          <BaseButton variant="primary" type="submit" :loading="editBusy" :disabled="!editName.trim()">Guardar</BaseButton>
        </div>
      </form>
    </BottomSheet>
  </AppShell>
</template>

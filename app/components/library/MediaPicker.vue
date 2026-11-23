<script setup lang="ts">
import { filterLibrary, LIBRARY_ACCEPT, LIBRARY_MAX_FILES, tagCounts, type LibraryItem } from '~/utils/media-library'

/**
 * Selector de una imagen de la biblioteca (hoja inferior): buscar por nombre o etiqueta y pulsar una para elegirla.
 * Permite subir una imagen nueva sin salir de aquí (si subes una sola, se elige sola); no borra nada. Devuelve la elegida.
 * Se usa en las portadas de publicaciones y de paquetes.
 */
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ pick: [item: LibraryItem] }>()

const { items, loaded, loading, uploading, error, load, upload } = useMediaLibrary()
const fileInput = ref<HTMLInputElement | null>(null)
const uploadErrors = ref<string[]>([])
const query = ref('')
const tag = ref<string | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) return
  query.value = ''
  tag.value = null
  uploadErrors.value = []
  load()
})

const visible = computed(() => filterLibrary(items.value, query.value, tag.value))
const tags = computed(() => tagCounts(items.value).slice(0, 12))
function choose(item: LibraryItem) {
  emit('pick', item)
  open.value = false
}

const full = computed(() => items.value.length >= LIBRARY_MAX_FILES)
async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  uploadErrors.value = []
  const result = await upload(files)
  uploadErrors.value = result.errors
  // Una sola imagen subida: es la que se quería usar, así que se elige sin más pasos.
  if (files.length === 1 && result.added === 1 && items.value[0]) choose(items.value[0])
}
</script>

<template>
  <BottomSheet v-model="open" title="Elegir de tu biblioteca" wide>
    <div class="libpick" data-media-picker>
      <p v-if="error" class="libpick__msg" role="alert">
        {{ error }} <button type="button" class="underline font-semibold" @click="load(true)">Reintentar</button>
      </p>

      <template v-else-if="loading && !loaded">
        <div class="libpick__grid"><SkeletonBlock v-for="n in 8" :key="n" height="7rem" rounded="var(--radius-md)" /></div>
      </template>

      <EmptyState v-else-if="!items.length" icon="ph:images" mascot="swim" title="Tu biblioteca está vacía" description="Sube aquí las imágenes que usas a menudo y podrás ponerlas de portada con un toque.">
        <BaseButton variant="primary" size="sm" icon="ph:upload-simple-bold" :loading="uploading" data-picker-upload @click="fileInput?.click()">Subir una imagen</BaseButton>
      </EmptyState>

      <template v-else>
        <label class="sr-only" for="libpick-q">Buscar en la biblioteca</label>
        <input id="libpick-q" v-model="query" type="search" class="input w-full" placeholder="Buscar por nombre o etiqueta…" autocomplete="off">
        <div v-if="tags.length" class="libpick__tags" role="group" aria-label="Filtrar por etiqueta">
          <button v-for="t in tags" :key="t.tag" type="button" class="libpick__tag" :aria-pressed="tag === t.tag" @click="tag = tag === t.tag ? null : t.tag">#{{ t.tag }}</button>
        </div>
        <p v-if="!visible.length" class="libpick__msg" role="status">Ninguna imagen coincide.</p>
        <div v-else class="libpick__grid">
          <button v-for="i in visible" :key="i.id" type="button" class="libpick__tile" :aria-label="`Usar «${i.name}»`" data-media-pick @click="choose(i)">
            <SmartImage :src="i.url" :width="240" :height="180" class="libpick__img" />
            <span class="libpick__name">{{ i.name }}</span>
          </button>
        </div>
      </template>

      <ul v-if="uploadErrors.length" class="libpick__msg" role="alert" data-picker-upload-errors>
        <li v-for="msg in uploadErrors" :key="msg">{{ msg }}</li>
      </ul>
      <p v-if="!error && !(loading && !loaded)" class="libpick__foot">
        <BaseButton v-if="items.length" variant="secondary" size="sm" icon="ph:upload-simple-bold" :loading="uploading" :disabled="uploading || full" data-picker-upload @click="fileInput?.click()">Subir una imagen</BaseButton>
        <NuxtLink to="/creator/library" class="underline font-semibold">Gestionar la biblioteca</NuxtLink>
      </p>
      <input ref="fileInput" type="file" :accept="LIBRARY_ACCEPT" class="hidden" data-picker-file @change="onFiles">
    </div>
  </BottomSheet>
</template>

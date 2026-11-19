<script setup lang="ts">
import { filterLibrary, tagCounts, type LibraryItem } from '~/utils/media-library'

/**
 * Selector de una imagen de la biblioteca (hoja inferior): buscar por nombre o etiqueta y pulsar una para elegirla.
 * No sube ni borra nada: solo devuelve la elegida. Se usa en las portadas de publicaciones y de paquetes.
 */
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ pick: [item: LibraryItem] }>()

const { items, loaded, loading, error, load } = useMediaLibrary()
const query = ref('')
const tag = ref<string | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) return
  query.value = ''
  tag.value = null
  load()
})

const visible = computed(() => filterLibrary(items.value, query.value, tag.value))
const tags = computed(() => tagCounts(items.value).slice(0, 12))
function choose(item: LibraryItem) {
  emit('pick', item)
  open.value = false
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
        <BaseButton to="/creator/library" variant="primary" size="sm" icon="ph:upload-simple-bold">Ir a la biblioteca</BaseButton>
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
        <p class="libpick__foot"><NuxtLink to="/creator/library" class="underline font-semibold">Gestionar la biblioteca</NuxtLink></p>
      </template>
    </div>
  </BottomSheet>
</template>

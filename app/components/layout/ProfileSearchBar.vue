<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { roleMeta } from '~/utils/nav'

const router = useRouter()
const { results, loading, search, clear } = useProfileSearch()

const query = ref('')
const open = ref(false)
const root = ref<HTMLElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// En móvil el input en línea competía por sitio con el título de la página
// y los iconos de chat/bandeja/avatar en la misma fila — el título acababa
// truncado a una o dos letras ("D…" en vez de "Descubrir"). Por debajo de
// `sm`, la barra pasa a ser solo un icono que abre la búsqueda en una hoja
// aparte (mismo BottomSheet.vue que el resto de la app, con su gestión de
// foco/Escape ya resuelta) en vez de malvivir en un input de 112px.
const mobileSheetOpen = ref(false)

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => search(value), 250)
  open.value = true
})

function go(result: { id: string; role: string }) {
  open.value = false
  mobileSheetOpen.value = false
  query.value = ''
  clear()
  router.push(`/profile/${result.role}/${result.id}`)
}

function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

watch(mobileSheetOpen, (isOpen) => {
  if (!isOpen) { query.value = ''; clear() }
})

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <!-- Escritorio/tablet: input en línea, igual que antes -->
  <div ref="root" class="relative shrink-0 w-44 md:w-40 lg:w-64 hidden sm:block">
    <div class="relative h-9">
      <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-faint)]" />
      <input
        v-model="query" type="text" placeholder="Buscar perfiles…"
        class="input w-full h-9 pl-9 pr-3"
        @focus="open = true" @keydown.escape="open = false"
      >
    </div>

    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition-[opacity,transform] duration-100 ease-[var(--ease-spring)]" leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open && query.trim()"
        class="absolute left-0 right-0 sm:right-auto sm:w-72 top-11 z-40 bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-md)] shadow-[var(--shadow-float)] max-h-80 overflow-y-auto nx-scroll"
      >
        <div v-if="loading" class="px-4 py-3 text-sm text-[var(--color-text-faint)]">Buscando…</div>
        <div v-else-if="!results.length" class="px-4 py-3 text-sm text-[var(--color-text-faint)]">Sin resultados.</div>
        <button
          v-for="r in results" :key="`${r.role}-${r.id}`" type="button"
          class="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--color-ink-overlay)]"
          @click="go(r)"
        >
          <BaseAvatar :initials="initialsFromName(r.name)" :hue="hueFromString(r.name)" size="sm" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-[var(--color-text)] truncate">{{ r.name }}</p>
            <p class="text-micro text-[var(--color-text-faint)] truncate">{{ roleMeta[r.role].label }} · {{ r.subtitle }}</p>
          </div>
        </button>
      </div>
    </Transition>
  </div>

  <!-- Móvil: solo un icono, la búsqueda real vive en una hoja aparte -->
  <button
    type="button" aria-label="Buscar perfiles" class="sm:hidden shrink-0 size-9 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-text)]"
    @click="mobileSheetOpen = true"
  >
    <Icon name="ph:magnifying-glass-bold" class="size-[1.15rem]" />
  </button>

  <BottomSheet v-model="mobileSheetOpen" title="Buscar perfiles">
    <div class="relative h-11 mb-3">
      <Icon name="ph:magnifying-glass-bold" class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-faint)]" />
      <input
        v-model="query" type="text" placeholder="Buscar perfiles…" autofocus
        class="input w-full h-11 pl-10 pr-3.5"
      >
    </div>
    <div v-if="query.trim()" class="flex flex-col -mx-1">
      <p v-if="loading" class="px-3 py-3 text-sm text-[var(--color-text-faint)]">Buscando…</p>
      <p v-else-if="!results.length" class="px-3 py-3 text-sm text-[var(--color-text-faint)]">Sin resultados.</p>
      <button
        v-for="r in results" :key="`${r.role}-${r.id}`" type="button"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-left hover:bg-[var(--color-ink-overlay)]"
        @click="go(r)"
      >
        <BaseAvatar :initials="initialsFromName(r.name)" :hue="hueFromString(r.name)" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="text-base font-medium text-[var(--color-text)] truncate">{{ r.name }}</p>
          <p class="text-sm text-[var(--color-text-faint)] truncate">{{ roleMeta[r.role].label }} · {{ r.subtitle }}</p>
        </div>
      </button>
    </div>
  </BottomSheet>
</template>

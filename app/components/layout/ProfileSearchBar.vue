<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { roleMeta } from '~/utils/nav'

const router = useRouter()
const { results, loading, search, clear } = useProfileSearch()

const query = ref('')
const open = ref(false)
const root = ref<HTMLElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => search(value), 250)
  open.value = true
})

function go(result: { id: string; role: string }) {
  open.value = false
  query.value = ''
  clear()
  router.push(`/profile/${result.role}/${result.id}`)
}

function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative shrink-0 w-28 sm:w-44 md:w-64">
    <div class="relative h-9">
      <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-faint)]" />
      <input
        v-model="query" type="text" placeholder="Buscar perfiles…"
        class="w-full h-9 pl-9 pr-3 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
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
        <div v-if="loading" class="px-4 py-3 text-[0.8125rem] text-[var(--color-text-faint)]">Buscando…</div>
        <div v-else-if="!results.length" class="px-4 py-3 text-[0.8125rem] text-[var(--color-text-faint)]">Sin resultados.</div>
        <button
          v-for="r in results" :key="`${r.role}-${r.id}`" type="button"
          class="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--color-ink-overlay)]"
          @click="go(r)"
        >
          <BaseAvatar :initials="initialsFromName(r.name)" :hue="hueFromString(r.name)" size="sm" />
          <div class="min-w-0 flex-1">
            <p class="text-[0.8125rem] font-medium text-[var(--color-text)] truncate">{{ r.name }}</p>
            <p class="text-[0.75rem] text-[var(--color-text-faint)] truncate">{{ roleMeta[r.role].label }} · {{ r.subtitle }}</p>
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { coverArtFromString } from '~/utils/avatar'
import type { SavedProfileEntry } from '~/composables/useSavedProfiles'

useHead({ title: 'Guardados' })

// Fuera de /creator y /partner a propósito, mismo criterio que /inbox: una
// sola pantalla sirve a los 2 roles, solo cambia el `role` de AppShell.
const { role, ensureRole } = useMyRole()
const myRole = role.value ?? (await ensureRole()) ?? 'creator'

const { toggleSave, listSaved } = useSavedProfiles()
const entries = ref<SavedProfileEntry[]>(await listSaved())

const router = useRouter()
function openProfile(entry: SavedProfileEntry) {
  router.push(`/profile/${entry.kind}/${entry.id}`)
}

async function unsave(entry: SavedProfileEntry) {
  await toggleSave(entry.kind, entry.id)
  entries.value = entries.value.filter((e) => e.savedId !== entry.savedId)
}

function coverStyle(entry: SavedProfileEntry) {
  const art = coverArtFromString(entry.id)
  const hue = art.from.match(/hsl\((\d+)/)?.[1] ?? '0'
  return {
    backgroundColor: `hsl(${hue} 24% 93%)`,
    backgroundImage: 'repeating-linear-gradient(45deg, rgb(26 22 37 / 5%) 0 8px, transparent 8px 16px)'
  }
}
</script>

<template>
  <AppShell :role="myRole" title="Guardados" subtitle="Candidatos que has marcado desde Descubrir">
    <EmptyState
      v-if="!entries.length"
      icon="ph:bookmark-simple" title="Todavía no has guardado a nadie"
      description="Desde Descubrir, pulsa el icono del marcador en cualquier perfil para añadirlo aquí."
    />
    <div v-else class="flex flex-col gap-3 md:max-w-xl">
      <div
        v-for="entry in entries" :key="entry.savedId"
        class="flex items-center gap-4 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3"
      >
        <button type="button" class="flex min-w-0 flex-1 items-center gap-4 text-left" :aria-label="`Ver el perfil de ${entry.name}`" @click="openProfile(entry)">
          <span class="relative size-14 shrink-0 rounded-[var(--radius-xs)] overflow-hidden" :style="!entry.coverUrl ? coverStyle(entry) : undefined">
            <img v-if="entry.coverUrl" :src="entry.coverUrl" alt="" class="absolute inset-0 size-full object-cover">
            <Icon v-else :name="entry.kind === 'creator' ? 'ph:user-focus' : 'ph:storefront-fill'" class="absolute inset-0 m-auto size-5 text-[var(--color-text)] opacity-30" />
          </span>
          <span class="min-w-0 flex-1 flex flex-col gap-1">
            <span class="text-[0.9375rem] font-semibold text-[var(--color-text)] truncate">{{ entry.name }}</span>
            <span v-if="entry.categories.length" class="flex flex-wrap gap-x-2 text-[0.75rem] text-[var(--color-text-muted)]">
              <span v-for="cat in entry.categories.slice(0, 3)" :key="cat">{{ cat }}</span>
            </span>
            <span v-if="entry.bio" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-snug line-clamp-1">{{ entry.bio }}</span>
          </span>
        </button>

        <button
          type="button" aria-label="Quitar de guardados"
          class="shrink-0 size-9 flex items-center justify-center rounded-full text-[var(--color-primary-500)] hover:bg-[var(--color-ink-overlay)]"
          @click="unsave(entry)"
        >
          <Icon name="ph:bookmark-simple-fill" class="size-[1.1rem]" />
        </button>
      </div>
    </div>
  </AppShell>
</template>

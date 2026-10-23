<script setup lang="ts">
import { coverArtFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import { formatRatingSummary, hasEnoughRatingsToShowAverage, type RatingSummary } from '~/utils/ratings'
import type { SavedProfileEntry } from '~/composables/useSavedProfiles'
import type { PublicProfile } from '~/composables/usePublicProfile'

useHead({ title: 'Guardados' })

// Fuera de /creator y /partner a propósito, mismo criterio que /inbox: una
// sola pantalla sirve a los 2 roles, solo cambia el `role` de AppShell.
const { role, ensureRole } = useMyRole()
const myRole = role.value ?? (await ensureRole()) ?? 'creator'

const { toggleSave, listSaved } = useSavedProfiles()
const entries = ref<SavedProfileEntry[]>(await listSaved())

const router = useRouter()
function openProfile(entry: { kind: 'creator' | 'partner'; id: string }) {
  router.push(`/profile/${entry.kind}/${entry.id}`)
}

async function unsave(entry: SavedProfileEntry) {
  await toggleSave(entry.kind, entry.id)
  entries.value = entries.value.filter((e) => e.savedId !== entry.savedId)
  selectedIds.value = selectedIds.value.filter((id) => id !== entry.savedId)
}

function coverStyle(id: string) {
  const art = coverArtFromString(id)
  const hue = art.from.match(/hsl\((\d+)/)?.[1] ?? '0'
  return {
    backgroundColor: `hsl(${hue} 24% 93%)`,
    backgroundImage: 'repeating-linear-gradient(45deg, rgb(26 22 37 / 5%) 0 8px, transparent 8px 16px)'
  }
}

// Comparar 2-3 guardados a la vez (roadmap, sección 6: "comparación de
// varios perfiles"). Se compara por `savedId` (no por el id de
// creators/partners) para que seleccionar sea sencillo desde la propia
// lista — el perfil completo (con tarifa/presupuesto, redes verificadas y
// reputación, que `listSaved()` no trae) solo se pide al pulsar "Comparar",
// nunca para los guardados que no se van a comparar.
const MAX_COMPARE = 3
const compareMode = ref(false)
const selectedIds = ref<string[]>([])

function toggleCompareMode() {
  compareMode.value = !compareMode.value
  selectedIds.value = []
  compared.value = []
}

function toggleSelected(entry: SavedProfileEntry) {
  const i = selectedIds.value.indexOf(entry.savedId)
  if (i !== -1) {
    selectedIds.value.splice(i, 1)
    return
  }
  if (selectedIds.value.length >= MAX_COMPARE) return
  selectedIds.value.push(entry.savedId)
}

interface ComparedProfile {
  entry: SavedProfileEntry
  profile: PublicProfile
  rating: RatingSummary
}

const { loadProfile } = usePublicProfile()
const { fetchSummary } = useRatings()
const comparing = ref(false)
const compared = ref<ComparedProfile[]>([])

async function runCompare() {
  const selectedEntries = entries.value.filter((e) => selectedIds.value.includes(e.savedId))
  if (selectedEntries.length < 2) return
  comparing.value = true
  try {
    compared.value = (await Promise.all(
      selectedEntries.map(async (entry) => {
        const profile = await loadProfile(entry.kind, entry.id)
        if (!profile) return null
        const rating = await fetchSummary(profile.profileId)
        return { entry, profile, rating }
      })
    )).filter((c): c is ComparedProfile => !!c)
  } finally {
    comparing.value = false
  }
}

function rangeLabel(profile: PublicProfile) {
  if (!profile.minCents && !profile.maxCents) return null
  return `${profile.minCents ? formatEuros(profile.minCents) : '…'}–${profile.maxCents ? formatEuros(profile.maxCents) : '…'}`
}
</script>

<template>
  <AppShell :role="myRole" title="Guardados" subtitle="Candidatos que has marcado desde Descubrir">
    <EmptyState
      v-if="!entries.length"
      icon="ph:bookmark-simple" title="Todavía no has guardado a nadie"
      description="Desde Descubrir, pulsa el icono del marcador en cualquier perfil para añadirlo aquí."
    />
    <template v-else>
      <div class="flex items-center justify-between gap-3 mb-4 md:max-w-xl">
        <p v-if="compareMode" class="text-[0.8125rem] text-[var(--color-text-muted)]">
          Elige entre 2 y {{ MAX_COMPARE }} para comparar ({{ selectedIds.length }} seleccionados)
        </p>
        <span v-else />
        <button
          v-if="entries.length > 1"
          type="button" class="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[0.8125rem] font-medium border border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-hairline-strong)]"
          @click="toggleCompareMode"
        >
          <Icon name="ph:columns-fill" class="size-4" />
          {{ compareMode ? 'Cancelar' : 'Comparar' }}
        </button>
      </div>

      <div class="flex flex-col gap-3 md:max-w-xl mb-6">
        <div
          v-for="entry in entries" :key="entry.savedId"
          class="flex items-center gap-4 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3"
        >
          <button
            v-if="compareMode" type="button" role="checkbox" :aria-checked="selectedIds.includes(entry.savedId)"
            :aria-label="`Seleccionar a ${entry.name} para comparar`"
            :disabled="!selectedIds.includes(entry.savedId) && selectedIds.length >= MAX_COMPARE"
            class="shrink-0 size-6 rounded-full border-2 flex items-center justify-center disabled:opacity-30"
            :class="selectedIds.includes(entry.savedId) ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)]' : 'border-[var(--color-hairline-strong)]'"
            @click="toggleSelected(entry)"
          >
            <Icon v-if="selectedIds.includes(entry.savedId)" name="ph:check-bold" class="size-3.5 text-white" />
          </button>

          <button type="button" class="flex min-w-0 flex-1 items-center gap-4 text-left" :aria-label="`Ver el perfil de ${entry.name}`" @click="openProfile(entry)">
            <span class="relative size-14 shrink-0 rounded-[var(--radius-xs)] overflow-hidden" :style="!entry.coverUrl ? coverStyle(entry.id) : undefined">
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
            v-if="!compareMode"
            type="button" aria-label="Quitar de guardados"
            class="shrink-0 size-9 flex items-center justify-center rounded-full text-[var(--color-primary-500)] hover:bg-[var(--color-ink-overlay)]"
            @click="unsave(entry)"
          >
            <Icon name="ph:bookmark-simple-fill" class="size-[1.1rem]" />
          </button>
        </div>
      </div>

      <BaseButton
        v-if="compareMode && selectedIds.length >= 2"
        variant="primary" size="md" icon="ph:columns-fill" :icon-spin="comparing" :disabled="comparing" class="mb-6"
        @click="runCompare"
      >
        {{ comparing ? 'Cargando…' : `Comparar (${selectedIds.length})` }}
      </BaseButton>

      <section v-if="compared.length" aria-label="Comparación de candidatos">
        <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Comparación</h2>
        <div class="flex items-stretch gap-4 overflow-x-auto nx-scroll pb-2">
          <div v-for="c in compared" :key="c.entry.savedId" class="shrink-0 w-72 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3.5">
            <ProfileHeaderCard
              compact
              :name="c.profile.name" :role-label="c.entry.kind === 'creator' ? 'Creador de contenido' : 'Partner'"
              :avatar-url="c.profile.avatarUrl" :cover-url="c.profile.coverUrl" :cover-seed="c.profile.profileId"
              :categories="c.profile.categories" :bio="c.profile.bio"
              :range-label="rangeLabel(c.profile)" :range-field-label="c.entry.kind === 'creator' ? 'Tarifa orientativa' : 'Presupuesto'"
              :looking-for="null" :verified-socials="c.profile.verifiedSocials"
            />

            <div v-if="rangeLabel(c.profile)" class="flex items-center justify-between text-[0.8125rem] mb-2.5">
              <span class="text-[var(--color-text-faint)]">{{ c.entry.kind === 'creator' ? 'Tarifa' : 'Presupuesto' }}</span>
              <span class="font-medium text-[var(--color-text)]">{{ rangeLabel(c.profile) }}</span>
            </div>

            <div class="flex items-center justify-between text-[0.8125rem] mb-3.5">
              <span class="text-[var(--color-text-faint)]">Reputación</span>
              <span v-if="c.rating.ratingCount === 0" class="text-[var(--color-text-muted)]">Sin valoraciones</span>
              <span v-else class="inline-flex items-center gap-1.5">
                <RatingStars v-if="hasEnoughRatingsToShowAverage(c.rating.ratingCount)" :model-value="Math.round(c.rating.avgStars)" readonly size="sm" />
                <span class="text-[var(--color-text-muted)]">{{ formatRatingSummary(c.rating) }}</span>
              </span>
            </div>

            <BaseButton variant="secondary" size="sm" class="w-full" @click="openProfile(c.entry)">Ver perfil completo</BaseButton>
          </div>
        </div>
      </section>
    </template>
  </AppShell>
</template>

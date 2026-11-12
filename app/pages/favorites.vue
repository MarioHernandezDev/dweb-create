<script setup lang="ts">
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

const kindIcon = (kind: 'creator' | 'partner') => (kind === 'creator' ? 'ph:user-focus' : 'ph:storefront-fill')

function rangeLabel(profile: PublicProfile) {
  if (!profile.minCents && !profile.maxCents) return null
  return `${profile.minCents ? formatEuros(profile.minCents) : '…'}–${profile.maxCents ? formatEuros(profile.maxCents) : '…'}`
}
</script>

<template>
  <AppShell :role="myRole" title="Guardados" subtitle="Candidatos que has marcado desde Descubrir" full-width>
    <EmptyState
      v-if="!entries.length"
      icon="ph:bookmark-simple" title="Todavía no has guardado a nadie"
      description="Desde Descubrir, pulsa el icono del marcador en cualquier perfil para añadirlo aquí."
    >
      <BaseButton :to="`/${myRole}/discover`" variant="primary" size="sm">Ir a Descubrir</BaseButton>
    </EmptyState>
    <template v-else>
      <div class="list-toolbar">
        <p class="list-toolbar__note">
          <template v-if="compareMode">Elige entre 2 y {{ MAX_COMPARE }} para comparar ({{ selectedIds.length }} seleccionados)</template>
          <template v-else>{{ entries.length }} {{ entries.length === 1 ? 'perfil guardado' : 'perfiles guardados' }}</template>
        </p>
        <BaseButton v-if="entries.length > 1" variant="outline" size="sm" icon="ph:columns-fill" @click="toggleCompareMode">
          {{ compareMode ? 'Cancelar' : 'Comparar' }}
        </BaseButton>
      </div>

      <div class="saved-grid">
        <article v-for="entry in entries" :key="entry.savedId" class="scard" :class="selectedIds.includes(entry.savedId) && 'is-selected'">
          <div class="scard__media">
            <CoverArt :seed="entry.id" :icon="kindIcon(entry.kind)" />
            <SmartImage v-if="entry.coverUrl" :src="entry.coverUrl" :width="440" :height="248" class="scard__photo" />

            <button
              v-if="compareMode" type="button" role="checkbox" class="scard__check"
              :aria-checked="selectedIds.includes(entry.savedId)" :aria-label="`Seleccionar a ${entry.name} para comparar`"
              :disabled="!selectedIds.includes(entry.savedId) && selectedIds.length >= MAX_COMPARE"
              @click="toggleSelected(entry)"
            >
              <Icon v-if="selectedIds.includes(entry.savedId)" name="ph:check-bold" class="size-4" />
            </button>
            <button v-else type="button" class="scard__action" :aria-label="`Quitar a ${entry.name} de guardados`" @click="unsave(entry)">
              <Icon name="ph:bookmark-simple-fill" class="size-4" />
            </button>
          </div>

          <div class="scard__body">
            <div v-if="entry.categories.length" class="scard__cats">
              <Chip v-for="cat in entry.categories.slice(0, 3)" :key="cat" size="sm">{{ cat }}</Chip>
            </div>
            <h2 class="scard__name">
              <NuxtLink :to="`/profile/${entry.kind}/${entry.id}`" class="scard__link">{{ entry.name }}</NuxtLink>
            </h2>
            <p v-if="entry.bio" class="scard__bio">{{ entry.bio }}</p>
          </div>
        </article>
      </div>

      <BaseButton v-if="compareMode && selectedIds.length >= 2" variant="primary" icon="ph:columns-fill" :loading="comparing" @click="runCompare">
        {{ comparing ? 'Cargando…' : `Comparar (${selectedIds.length})` }}
      </BaseButton>

      <section v-if="compared.length" class="compare" aria-labelledby="compare-title">
        <SectionTitle title="Comparación" class="mb-4" />
        <div class="compare__row nx-scroll">
          <BaseCard v-for="c in compared" :key="c.entry.savedId" padding="sm" class="compare__col">
            <ProfileHeaderCard
              compact
              :name="c.profile.name" :role-label="c.entry.kind === 'creator' ? 'Creador de contenido' : 'Partner'"
              :avatar-url="c.profile.avatarUrl" :cover-url="c.profile.coverUrl" :cover-seed="c.profile.profileId"
              :categories="c.profile.categories" :bio="c.profile.bio"
              :range-label="rangeLabel(c.profile)" :range-field-label="c.entry.kind === 'creator' ? 'Tarifa orientativa' : 'Presupuesto'"
              :looking-for="null"
            />

            <div v-if="rangeLabel(c.profile)" class="compare__fact">
              <span class="compare__fact-label">{{ c.entry.kind === 'creator' ? 'Tarifa' : 'Presupuesto' }}</span>
              <span class="compare__fact-value">{{ rangeLabel(c.profile) }}</span>
            </div>

            <div class="compare__fact">
              <span class="compare__fact-label">Reputación</span>
              <span v-if="c.rating.ratingCount === 0">Sin valoraciones</span>
              <span v-else class="inline-flex items-center gap-1.5">
                <RatingStars v-if="hasEnoughRatingsToShowAverage(c.rating.ratingCount)" :model-value="Math.round(c.rating.avgStars)" readonly size="sm" />
                <span>{{ formatRatingSummary(c.rating) }}</span>
              </span>
            </div>

            <BaseButton variant="secondary" size="sm" block @click="openProfile(c.entry)">Ver perfil completo</BaseButton>
          </BaseCard>
        </div>
      </section>
    </template>
  </AppShell>
</template>

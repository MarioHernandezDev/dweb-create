<script setup lang="ts">
import { coverArtFromString } from '~/utils/avatar'
import { formatCompactNumber, formatEuros } from '~/utils/mock-data'
import type { DiscoveryResult } from '~/composables/useDiscover'

const props = defineProps<{
  result: DiscoveryResult
  kind: 'creator' | 'partner'
  ctaLabel: string
}>()

defineEmits<{ contact: [] }>()

const router = useRouter()
function openProfile() {
  router.push(`/profile/${props.kind}/${props.result.id}`)
}

const { isSaved, toggleSave, toggling, ensureIdsLoaded } = useSavedProfiles()
onMounted(() => ensureIdsLoaded())
const saved = computed(() => isSaved(props.kind, props.result.id))

// Mismo lenguaje que BoardCard/PackageCard/FeaturedDeck: textura de
// claqueta desaturada en vez de un degradado vistoso, cuando no hay foto.
const coverArt = computed(() => coverArtFromString(props.result.id))
const coverStyle = computed(() => ({
  backgroundColor: `hsl(${coverArt.value.from.match(/hsl\((\d+)/)?.[1] ?? 0} 24% 93%)`,
  backgroundImage: 'repeating-linear-gradient(45deg, rgb(26 22 37 / 5%) 0 8px, transparent 8px 16px)'
}))
const icon = computed(() => (props.kind === 'creator' ? 'ph:user-focus' : 'ph:storefront-fill'))
const topCategories = computed(() => props.result.categories.slice(0, 3))

const budgetLabel = computed(() => {
  const { minCents, maxCents } = props.result
  if (!minCents && !maxCents) return null
  return `${minCents ? formatEuros(minCents) : '…'}–${maxCents ? formatEuros(maxCents) : '…'}`
})
</script>

<template>
  <div class="flex items-center gap-4 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3 transition-colors hover:border-[var(--color-hairline-strong)]">
    <!-- Botón de verdad, no un div con @click: así se puede llegar con Tab y activar con Enter/Espacio. -->
    <button type="button" class="flex min-w-0 flex-1 items-center gap-4 text-left" :aria-label="`Ver el perfil de ${result.name}`" @click="openProfile">
      <span class="relative size-14 shrink-0 rounded-[var(--radius-xs)] overflow-hidden" :style="!result.coverUrl ? coverStyle : undefined">
        <img v-if="result.coverUrl" :src="result.coverUrl" alt="" class="absolute inset-0 size-full object-cover">
        <Icon v-else :name="icon" class="absolute inset-0 m-auto size-5 text-[var(--color-text)] opacity-30" />
      </span>

      <span class="min-w-0 flex-1 flex flex-col gap-1">
        <span class="text-[0.9375rem] font-semibold text-[var(--color-text)] truncate">{{ result.name }}</span>
        <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-[var(--color-text-muted)]">
          <span v-for="cat in topCategories" :key="cat">{{ cat }}</span>
          <span v-if="kind === 'creator' && result.followers" class="inline-flex items-center gap-1"><Icon name="ph:users-three-fill" class="size-3" /> {{ formatCompactNumber(result.followers) }}</span>
          <span v-if="budgetLabel" class="inline-flex items-center gap-1"><Icon name="ph:currency-eur" class="size-3" /> {{ budgetLabel }}</span>
        </span>
        <span v-if="result.bio" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-snug line-clamp-1">{{ result.bio }}</span>
      </span>
    </button>

    <button
      type="button" class="shrink-0 size-9 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-primary-500)] disabled:opacity-50"
      :disabled="toggling === result.id" :aria-label="saved ? `Quitar a ${result.name} de guardados` : `Guardar a ${result.name}`" :aria-pressed="saved"
      @click="toggleSave(kind, result.id)"
    >
      <Icon :name="saved ? 'ph:bookmark-simple-fill' : 'ph:bookmark-simple'" class="size-[1.1rem]" :class="saved && 'text-[var(--color-primary-500)]'" />
    </button>
    <BaseButton variant="secondary" size="sm" class="shrink-0" @click="$emit('contact')">{{ ctaLabel }}</BaseButton>
  </div>
</template>

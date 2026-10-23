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

function onToggleSave(e: MouseEvent) {
  e.stopPropagation()
  toggleSave(props.kind, props.result.id)
}

// Mismo lenguaje que BoardCard/PackageCard/FeaturedDeck: textura de
// claqueta desaturada en vez de un degradado vistoso, cuando no hay foto.
const coverArt = computed(() => coverArtFromString(props.result.id))
const coverStyle = computed(() => ({
  backgroundColor: `hsl(${coverArt.value.from.match(/hsl\((\d+)/)?.[1] ?? 0} 24% 93%)`,
  backgroundImage: 'repeating-linear-gradient(45deg, rgb(26 22 37 / 5%) 0 8px, transparent 8px 16px)'
}))
const icon = computed(() => (props.kind === 'creator' ? 'ph:user-focus' : 'ph:storefront-fill'))
const topCategories = computed(() => props.result.categories.slice(0, 2))

const budgetLabel = computed(() => {
  const { minCents, maxCents } = props.result
  if (!minCents && !maxCents) return null
  return `${minCents ? formatEuros(minCents) : '…'}–${maxCents ? formatEuros(maxCents) : '…'}`
})
</script>

<template>
  <!--
    Tarjeta vertical compacta — pensada para ir en cuadrícula (2-4 columnas
    según ancho), no en una única fila como antes: portada arriba, datos
    clave debajo, acciones en la base. Mismo lenguaje visual que
    FeaturedDeck (portada/degradado + badges) pero bastante más pequeña,
    para poder comparar varios perfiles de un vistazo.
  -->
  <article class="relative flex flex-col rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-hairline)] bg-[var(--color-paper)] transition-colors hover:border-[var(--color-hairline-strong)]">
    <button type="button" class="relative h-32 w-full text-left" :aria-label="`Ver el perfil de ${result.name}`" @click="openProfile">
      <img v-if="result.coverUrl" :src="result.coverUrl" alt="" class="absolute inset-0 size-full object-cover">
      <div v-else class="absolute inset-0" :style="coverStyle">
        <Icon :name="icon" class="absolute inset-0 m-auto size-7 text-[var(--color-text)] opacity-25" />
      </div>
    </button>

    <button
      type="button" class="absolute top-2 left-2 z-10 size-8 flex items-center justify-center rounded-full bg-[var(--color-slate)]/70 backdrop-blur-sm disabled:opacity-50"
      :disabled="toggling === result.id" :aria-label="saved ? `Quitar a ${result.name} de guardados` : `Guardar a ${result.name}`" :aria-pressed="saved"
      @click="onToggleSave"
    >
      <Icon :name="saved ? 'ph:bookmark-simple-fill' : 'ph:bookmark-simple'" class="size-4" :class="saved ? 'text-[var(--color-primary-500)]' : 'text-white'" />
    </button>

    <div class="flex flex-col flex-1 gap-2 p-3.5">
      <button type="button" class="text-left" @click="openProfile">
        <p class="text-[0.9375rem] font-semibold text-[var(--color-text)] truncate">{{ result.name }}</p>
        <p v-if="topCategories.length" class="text-[0.75rem] text-[var(--color-text-muted)] truncate mt-0.5">{{ topCategories.join(' · ') }}</p>
      </button>

      <p v-if="result.bio" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-snug line-clamp-2">{{ result.bio }}</p>

      <div v-if="(kind === 'creator' && result.followers) || budgetLabel" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-[var(--color-text-faint)] mt-auto pt-1">
        <span v-if="kind === 'creator' && result.followers" class="inline-flex items-center gap-1"><Icon name="ph:users-three-fill" class="size-3" /> {{ formatCompactNumber(result.followers) }}</span>
        <span v-if="budgetLabel" class="inline-flex items-center gap-1"><Icon name="ph:currency-eur" class="size-3" /> {{ budgetLabel }}</span>
      </div>

      <BaseButton variant="secondary" size="sm" class="w-full mt-1" @click="$emit('contact')">{{ ctaLabel }}</BaseButton>
    </div>
  </article>
</template>

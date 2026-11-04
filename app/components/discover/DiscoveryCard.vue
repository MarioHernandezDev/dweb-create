<script setup lang="ts">
import { formatCompactNumber, formatEuros } from '~/utils/mock-data'
import type { DiscoveryResult } from '~/composables/useDiscover'

/**
 * Tarjeta de un perfil en Descubrir (creador o partner). Toda la tarjeta abre
 * el perfil (enlace extendido sobre el nombre: un solo enlace real, sin
 * botones dentro de botones); guardar y contactar quedan por encima.
 * La portada carga optimizada y diferida; sin foto o mientras carga se ve el
 * tinte de CoverArt.
 */
const props = defineProps<{
  result: DiscoveryResult
  kind: 'creator' | 'partner'
  ctaLabel: string
  /** Ya hay una solicitud sin responder con esta persona. */
  isPending?: boolean
  /** Tarjeta grande de «Recomendados» (muestra el motivo de la afinidad). */
  featured?: boolean
  /** Enseña el % de afinidad (solo cuando hay un criterio de verdad detrás). */
  showScore?: boolean
  /** Primeras tarjetas: la foto se carga ya, con prioridad. */
  priority?: boolean
}>()

defineEmits<{ contact: [] }>()

const { isSaved, toggleSave, toggling, ensureIdsLoaded } = useSavedProfiles()
onMounted(() => ensureIdsLoaded())
const saved = computed(() => isSaved(props.kind, props.result.id))

const icon = computed(() => (props.kind === 'creator' ? 'ph:user-focus' : 'ph:storefront-fill'))
const topCategories = computed(() => props.result.categories.slice(0, props.featured ? 3 : 2))
const budgetLabel = computed(() => {
  const { minCents, maxCents } = props.result
  if (!minCents && !maxCents) return null
  return `${minCents ? formatEuros(minCents) : '…'}–${maxCents ? formatEuros(maxCents) : '…'}`
})
const imageFailed = ref(false)
</script>

<template>
  <article class="dcard" :class="featured && 'dcard--featured'">
    <div class="dcard__media">
      <CoverArt :seed="result.id" :icon="icon" />
      <SmartImage
        v-if="result.coverUrl && !imageFailed" :src="result.coverUrl" :width="featured ? 640 : 440" :height="featured ? 400 : 275"
        :priority="priority" class="dcard__photo" @error="imageFailed = true"
      />

      <button
        type="button" class="dcard__save" :class="saved && 'is-saved'"
        :disabled="toggling === result.id" :aria-label="saved ? `Quitar a ${result.name} de guardados` : `Guardar a ${result.name}`" :aria-pressed="saved"
        @click="toggleSave(kind, result.id)"
      >
        <Icon :name="saved ? 'ph:bookmark-simple-fill' : 'ph:bookmark-simple-bold'" class="size-4" />
      </button>
      <span v-if="showScore" class="dcard__score">{{ Math.round(result.score) }}% de afinidad</span>
    </div>

    <div class="dcard__body">
      <div v-if="topCategories.length" class="dcard__cats">
        <Chip v-for="c in topCategories" :key="c" size="sm">{{ c }}</Chip>
      </div>

      <h3 class="dcard__name">
        <NuxtLink :to="`/profile/${kind}/${result.id}`" class="dcard__link">{{ result.name }}</NuxtLink>
      </h3>

      <p v-if="featured && result.reason" class="dcard__reason"><Icon name="ph:lightbulb-fill" class="size-4 shrink-0 mt-0.5" />{{ result.reason }}</p>
      <p v-else-if="result.bio" class="dcard__bio">{{ result.bio }}</p>
      <p v-else class="dcard__bio dcard__bio--empty">Ficha en construcción</p>

      <p v-if="(kind === 'creator' && result.followers) || budgetLabel" class="dcard__facts">
        <span v-if="kind === 'creator' && result.followers"><Icon name="ph:users-three-fill" class="size-4" />{{ formatCompactNumber(result.followers) }} seguidores</span>
        <span v-if="budgetLabel"><Icon name="ph:currency-eur" class="size-4" />{{ budgetLabel }}</span>
      </p>
    </div>

    <div class="dcard__foot">
      <span v-if="isPending" class="collab-status" data-status="requested">Pendiente de respuesta</span>
      <BaseButton v-else variant="primary" size="sm" block @click="$emit('contact')">{{ ctaLabel }}</BaseButton>
    </div>
  </article>
</template>

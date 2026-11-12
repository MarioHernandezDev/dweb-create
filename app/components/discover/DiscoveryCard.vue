<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { PLATFORM_SHORT, responseLabel } from '~/utils/discover-view'
import type { DiscoveryResult } from '~/composables/useDiscover'

/**
 * Tarjeta de un perfil en Descubrir (creador o partner). Toda la tarjeta abre
 * el perfil (enlace extendido sobre el nombre: un solo enlace real, sin
 * botones dentro de botones); guardar, escribir y contactar quedan por encima.
 * La portada carga optimizada y diferida; sin foto o mientras carga se ve el
 * tinte de CoverArt con la inicial.
 *
 * Los datos de actividad (responde en, colaboraciones, redes) vienen del servidor y
 * solo se enseñan cuando existen: nada se rellena por defecto.
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

const topCategories = computed(() => props.result.categories.slice(0, props.featured ? 3 : 2))
const budgetLabel = computed(() => {
  const { minCents, maxCents } = props.result
  if (!minCents && !maxCents) return null
  return `${minCents ? formatEuros(minCents) : '…'} – ${maxCents ? formatEuros(maxCents) : '…'}`
})
const budgetCaption = computed(() => (props.kind === 'partner' ? 'Presupuesto' : 'Tarifa'))
const response = computed(() => responseLabel(props.result.responseHours))
const initial = computed(() => (props.result.name.trim()[0] ?? '?').toUpperCase())
const imageFailed = ref(false)

// «Enviar mensaje»: la misma RPC que «Iniciar chat» del perfil (respeta la privacidad del chat).
const { openConversationWith } = useChat()
const toast = useToast()
const opening = ref(false)
async function message() {
  if (opening.value) return
  opening.value = true
  try {
    const conversationId = await openConversationWith(props.result.profileId)
    await navigateTo(`/chat/${conversationId}`)
  } catch (e) {
    toast.error(errorMessage(e, 'No se ha podido abrir el chat.'))
  } finally {
    opening.value = false
  }
}
</script>

<template>
  <article class="dcard" :class="featured && 'dcard--featured'">
    <div class="dcard__media">
      <CoverArt :seed="result.id" />
      <span class="dcard__initial" aria-hidden="true">{{ initial }}</span>
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
      <span v-if="showScore" class="dcard__score">{{ Math.round(result.score) }}% afín</span>
    </div>

    <div class="dcard__body">
      <div v-if="topCategories.length" class="dcard__cats">
        <Chip v-for="c in topCategories" :key="c" size="sm">{{ c }}</Chip>
      </div>

      <h3 class="dcard__name">
        <NuxtLink :to="`/profile/${kind}/${result.id}`" class="dcard__link">{{ result.name }}</NuxtLink>
        <Icon v-if="result.verified" name="ph:seal-check-fill" class="dcard__verified" title="Marca verificada por CIBERAN" aria-label="Marca verificada" />
      </h3>

      <p v-if="featured && result.reason" class="dcard__reason"><Icon name="ph:lightbulb-fill" class="size-4 shrink-0 mt-0.5" />{{ result.reason }}</p>
      <p v-else-if="result.bio" class="dcard__bio">{{ result.bio }}</p>
      <p v-else class="dcard__bio dcard__bio--empty">Ficha en construcción</p>

      <ul v-if="response || result.collabCount" class="dcard__facts">
        <li v-if="response"><Icon name="ph:clock" class="size-4" />Responde en {{ response }}</li>
        <li v-if="result.collabCount"><Icon name="ph:check-bold" class="size-4" />{{ result.collabCount }} {{ result.collabCount === 1 ? 'colaboración' : 'colaboraciones' }}</li>
      </ul>

      <div v-if="result.platforms.length" class="dcard__platforms">
        <span v-for="p in result.platforms" :key="p" class="dcard__platform">{{ PLATFORM_SHORT[p] ?? p }}</span>
      </div>

      <p v-if="budgetLabel" class="dcard__budget"><span>{{ budgetCaption }}</span><strong>{{ budgetLabel }}</strong></p>
    </div>

    <div class="dcard__foot">
      <span v-if="isPending" class="collab-status" data-status="requested">Pendiente de respuesta</span>
      <template v-else>
        <button
          type="button" class="dcard__msg" :disabled="opening" :aria-label="`Enviar un mensaje a ${result.name}`" title="Enviar mensaje"
          @click="message"
        >
          <Icon :name="opening ? 'ph:circle-notch-bold' : 'ph:envelope-simple'" class="size-5" :class="opening && 'animate-spin'" />
        </button>
        <BaseButton variant="primary" size="md" class="dcard__cta" @click="$emit('contact')">{{ ctaLabel }}</BaseButton>
      </template>
    </div>
  </article>
</template>

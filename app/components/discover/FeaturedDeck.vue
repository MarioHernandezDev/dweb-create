<script setup lang="ts">
import { coverArtFromString } from '~/utils/avatar'
import { formatCompactNumber, formatEuros } from '~/utils/mock-data'
import type { DiscoveryResult } from '~/composables/useDiscover'

const props = defineProps<{
  results: DiscoveryResult[]
  kind: 'creator' | 'partner'
  ctaLabel: string
  summary: string | null
  categories: string[]
  /** `aiLoading` de useDiscover — mientras es `true` y aún no hay resultados puntuados, se ven placeholders en vez de cards vacías. */
  loading: boolean
  /** `false` cuando la puntuación es el 50% heurístico por defecto (sin filtro de categorías ni IA) — igual para todo el mundo, así que no se enseña como si significara algo. */
  scoreMeaningful: boolean
}>()

const emit = defineEmits<{ contact: [result: DiscoveryResult]; 'visible-change': [ids: string[]] }>()

const router = useRouter()
function openProfile(result: DiscoveryResult) {
  router.push(`/profile/${props.kind}/${result.id}`)
}

const { isSaved, toggleSave, toggling, ensureIdsLoaded } = useSavedProfiles()
onMounted(() => ensureIdsLoaded())
function onToggleSave(e: MouseEvent, result: DiscoveryResult) {
  e.stopPropagation()
  toggleSave(props.kind, result.id)
}

const icon = computed(() => (props.kind === 'creator' ? 'ph:user-focus' : 'ph:storefront-fill'))
function coverStyle(result: DiscoveryResult) {
  const art = coverArtFromString(result.id)
  const hue = art.from.match(/hsl\((\d+)/)?.[1] ?? '0'
  return {
    backgroundColor: `hsl(${hue} 24% 93%)`,
    backgroundImage: 'repeating-linear-gradient(45deg, rgb(26 22 37 / 5%) 0 8px, transparent 8px 16px)'
  }
}
function budgetLabel(result: DiscoveryResult) {
  const { minCents, maxCents } = result
  if (!minCents && !maxCents) return null
  return `${minCents ? formatEuros(minCents) : '…'}–${maxCents ? formatEuros(maxCents) : '…'}`
}

// Cuántas cards caben de verdad a la vez según el ancho de pantalla — el
// propio mecanismo de avance (sumar una por la derecha, quitar una por la
// izquierda) es idéntico en cualquier dispositivo, solo cambia cuántas
// posiciones tiene la ventana.
const viewportWidth = ref(1280)
function syncViewportWidth() {
  viewportWidth.value = window.innerWidth
}
onMounted(() => {
  if (!import.meta.client) return
  syncViewportWidth()
  window.addEventListener('resize', syncViewportWidth)
})
onUnmounted(() => {
  if (import.meta.client) window.removeEventListener('resize', syncViewportWidth)
})
const WINDOW_SIZE = computed(() => (viewportWidth.value < 640 ? 1 : viewportWidth.value < 1024 ? 2 : 3))

// Ventana deslizante sobre `results` (ya ordenado por puntuación): se ve una
// tira de WINDOW_SIZE cards a la vez. "+" la desliza una posición — la de
// más a la izquierda desaparece, entra la siguiente por la derecha. Nunca
// crece sin límite ni repite un perfil dentro de la ventana.
//
// Al llegar los primeros resultados, en vez de aparecer de golpe, se
// revelan una a una (mismo movimiento que desplazar, disparado solo, sin
// esperar a que el usuario pulse nada).
const windowStart = ref(0)
const revealCount = ref(0)
const revealing = ref(false)

const visible = computed(() => props.results.slice(windowStart.value, windowStart.value + revealCount.value))
const canAdvance = computed(() => windowStart.value + revealCount.value < props.results.length)

// `prefers-reduced-motion` ya deja la transición de entrada/salida casi
// instantánea (regla global en main.css), pero el PACING del reveal (una
// cada 160ms) es un temporizador en JS, no CSS — no lo toca esa regla. Para
// quien pide menos movimiento, se revela todo de golpe en vez de ir
// goteando una a una.
const prefersReducedMotion = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

watch(
  () => props.results,
  async (list) => {
    windowStart.value = 0
    revealCount.value = 0
    if (!list.length) return
    const count = Math.min(WINDOW_SIZE.value, list.length)
    if (prefersReducedMotion) {
      revealCount.value = count
      return
    }
    revealing.value = true
    for (let i = 0; i < count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 160))
      revealCount.value++
    }
    revealing.value = false
  },
  // Imprescindible: la página hace `await runSearch()` en el setup, así que
  // `results` ya llega poblado desde el primer render de este componente —
  // sin `immediate`, el watch nunca ve la transición de vacío a poblado (ya
  // "pasó" antes de que el watcher empezara a mirar) y no se dispara nunca.
  // Por eso la cabecera "Destacados para ti" se pintaba pero ninguna card.
  { immediate: true }
)

watch(visible, (v) => emit('visible-change', v.map((r) => r.id)), { immediate: true })

// Qué lado se animó la última vez — decide qué juego de clases usa el
// TransitionGroup (ver `.nx-deck-*` vs `.nx-deck-back-*` en main.css):
// avanzar entra por la derecha y sale por la izquierda; retroceder es
// justo al revés. Sin esto, retroceder se vería visualmente idéntico a
// avanzar aunque el contenido fuera el contrario.
const direction = ref<'forward' | 'backward'>('forward')
const canGoBack = computed(() => windowStart.value > 0)

function advance() {
  if (!canAdvance.value || revealing.value) return
  direction.value = 'forward'
  if (revealCount.value < WINDOW_SIZE.value) revealCount.value++
  else windowStart.value++
}

function goBack() {
  if (!canGoBack.value || revealing.value) return
  direction.value = 'backward'
  windowStart.value--
}

const liveStatus = computed(() => {
  if (!revealCount.value) return ''
  return `Mostrando destacados ${windowStart.value + 1} a ${windowStart.value + revealCount.value} de ${props.results.length}.`
})
</script>

<template>
  <div class="mb-8">
    <div class="flex items-center gap-2.5 mb-3">
      <Icon name="ph:sparkle-fill" class="size-4 text-[var(--color-primary-500)]" />
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)]">Destacados para ti</h2>
      <span v-if="loading" class="inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-text-faint)]">
        <Icon name="ph:circle-notch-bold" class="size-3 animate-spin" /> la IA está analizando…
      </span>
    </div>

    <p class="sr-only" aria-live="polite">{{ liveStatus }}</p>

    <div class="flex items-stretch gap-3">
      <div v-if="results.length" class="flex flex-col items-center gap-1.5 shrink-0 self-center">
        <button
          type="button" :disabled="!canGoBack || revealing"
          :aria-label="canGoBack ? 'Ver destacados anteriores' : 'Estás al principio de los destacados'"
          class="shrink-0 size-11 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-ink-raised)] flex items-center justify-center text-[var(--color-text)] transition-colors hover:border-[var(--color-primary-500)]/50 hover:text-[var(--color-primary-500)] disabled:opacity-30 disabled:pointer-events-none"
          @click="goBack"
        >
          <Icon name="ph:caret-left-bold" class="size-5" />
        </button>
      </div>

      <div class="flex-1 min-w-0 overflow-x-auto nx-scroll">
        <div class="relative flex items-stretch gap-3 pb-1">
          <div
            v-if="summary"
            class="shrink-0 w-48 rounded-[var(--radius-sm)] border border-[var(--color-hairline-strong)] bg-[var(--color-slate)] p-4 flex flex-col justify-between"
          >
            <div>
              <Icon name="ph:sparkle-fill" class="size-5 text-white/60 mb-2.5" />
              <p class="text-[0.84375rem] text-white leading-relaxed">{{ summary }}</p>
            </div>
            <div v-if="categories.length" class="flex flex-wrap gap-1.5 mt-3">
              <span v-for="c in categories" :key="c" class="px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-white/12 text-white/85">{{ c }}</span>
            </div>
          </div>

          <template v-if="loading && !results.length">
            <div v-for="n in 2" :key="`sk-${n}`" class="shrink-0 w-64 h-[26rem] rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)] animate-pulse" />
          </template>

          <TransitionGroup tag="div" class="contents" :name="direction === 'forward' ? 'nx-deck' : 'nx-deck-back'">
            <article
              v-for="r in visible" :key="r.id"
              class="relative shrink-0 w-64 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-hairline)] bg-[var(--color-paper)] flex flex-col"
            >
              <button
                type="button" class="absolute top-3 right-3 z-10 size-9 flex items-center justify-center rounded-full bg-[var(--color-slate)]/70 backdrop-blur-sm disabled:opacity-50"
                :disabled="toggling === r.id" :aria-label="isSaved(kind, r.id) ? `Quitar a ${r.name} de guardados` : `Guardar a ${r.name}`" :aria-pressed="isSaved(kind, r.id)"
                @click="onToggleSave($event, r)"
              >
                <Icon :name="isSaved(kind, r.id) ? 'ph:bookmark-simple-fill' : 'ph:bookmark-simple'" class="size-[1.1rem]" :class="isSaved(kind, r.id) ? 'text-[var(--color-primary-500)]' : 'text-white'" />
              </button>

              <button type="button" class="relative h-72 w-full text-left" :aria-label="`Ver el perfil de ${r.name}`" @click="openProfile(r)">
                <img v-if="r.coverUrl" :src="r.coverUrl" alt="" class="absolute inset-0 size-full object-cover">
                <div v-else class="absolute inset-0" :style="coverStyle(r)">
                  <Icon :name="icon" class="absolute inset-0 m-auto size-9 text-[var(--color-text)] opacity-15" />
                </div>

                <span class="absolute inset-x-0 bottom-0 h-3/4" style="background: linear-gradient(to top, rgb(10 9 12 / 92%) 10%, rgb(10 9 12 / 0%) 100%)" />

                <span v-if="scoreMeaningful" class="absolute top-3 left-3 inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-[var(--color-slate)]/85 backdrop-blur-sm">
                  <span class="font-display text-[1rem] leading-none text-white">{{ r.score }}</span><span class="text-[0.625rem] text-white/60">%</span>
                </span>

                <div class="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1.5 text-left">
                  <div v-if="r.categories.length" class="flex flex-wrap gap-1">
                    <span v-for="c in r.categories.slice(0, 2)" :key="c" class="px-2 py-0.5 rounded-full text-[0.625rem] font-medium bg-white/15 text-white backdrop-blur-sm">{{ c }}</span>
                  </div>
                  <h3 class="font-display text-[1.25rem] text-white leading-snug truncate">{{ r.name }}</h3>
                  <p v-if="r.reason || r.bio" class="text-[0.8125rem] text-white/85 leading-snug line-clamp-2">{{ r.reason ?? r.bio }}</p>
                </div>
              </button>

              <div class="p-3.5 flex flex-col gap-2">
                <p v-if="r.lookingFor" class="text-[0.75rem] text-[var(--color-text-muted)] leading-snug line-clamp-1"><span class="text-[var(--color-text-faint)]">Busca:</span> {{ r.lookingFor }}</p>
                <div class="flex items-center gap-3 text-[0.75rem] text-[var(--color-text-muted)]">
                  <span v-if="kind === 'creator' && r.followers" class="inline-flex items-center gap-1">
                    <Icon name="ph:users-three-fill" class="size-3.5 text-[var(--color-text-faint)]" /> {{ formatCompactNumber(r.followers) }}
                  </span>
                  <span v-if="budgetLabel(r)" class="inline-flex items-center gap-1">
                    <Icon name="ph:currency-eur" class="size-3.5 text-[var(--color-text-faint)]" /> {{ budgetLabel(r) }}
                  </span>
                </div>
                <BaseButton variant="primary" size="sm" class="w-full" @click="$emit('contact', r)">{{ ctaLabel }}</BaseButton>
              </div>
            </article>
          </TransitionGroup>
        </div>
      </div>

      <div v-if="results.length" class="flex flex-col items-center gap-1.5 shrink-0 self-center">
        <button
          type="button" :disabled="!canAdvance || revealing"
          :aria-label="canAdvance ? 'Ver más destacados' : 'No hay más destacados disponibles'"
          class="shrink-0 size-11 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-ink-raised)] flex items-center justify-center text-[var(--color-text)] transition-colors hover:border-[var(--color-primary-500)]/50 hover:text-[var(--color-primary-500)] disabled:opacity-30 disabled:pointer-events-none"
          @click="advance"
        >
          <Icon name="ph:plus-bold" class="size-5" />
        </button>
        <p v-if="!canAdvance && !revealing" class="w-20 text-center text-[0.625rem] leading-snug text-[var(--color-text-faint)]">Son todos por ahora</p>
      </div>
    </div>
  </div>
</template>

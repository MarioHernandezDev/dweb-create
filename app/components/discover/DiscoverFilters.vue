<script setup lang="ts">
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import { platformMeta } from '~/utils/mock-data'
import { BUDGET_SLIDER, COLLAB_TYPES, type ResponseFilter } from '~/utils/discover-view'

/**
 * Filtros de Descubrir. Se aplican solos al cambiar:
 *  - categorías y presupuesto los resuelve el servidor;
 *  - redes y tiempo de respuesta se filtran en el cliente sobre datos reales de actividad.
 * El presupuesto es un deslizador de dos puntas; en los extremos (0 y 5.000 €) significa «sin límite».
 */
const props = defineProps<{
  active: boolean
  /** Cuántos resultados hay por red (con el resto de filtros aplicados), para el contador de cada casilla. */
  platformCounts: Record<string, number>
  /** Etiqueta del presupuesto: lo que paga la marca / lo que cobra el creador. */
  budgetLabel: string
  /** Solo al explorar marcas: tipo de colaboración y «solo verificadas». */
  brandFilters?: boolean
  /** Dentro de la hoja inferior el título ya lo pone la hoja: aquí no se repite. */
  hideTitle?: boolean
}>()
defineEmits<{ clear: [] }>()
const categories = defineModel<string[]>('categories', { required: true })
const minEuros = defineModel<number | null>('min', { required: true })
const maxEuros = defineModel<number | null>('max', { required: true })
const platforms = defineModel<string[]>('platforms', { required: true })
const response = defineModel<ResponseFilter>('response', { required: true })
const types = defineModel<string[]>('types', { required: true })
const verifiedOnly = defineModel<boolean>('verifiedOnly', { required: true })
const withPackages = defineModel<boolean>('withPackages', { default: false })
function toggleType(t: string) {
  types.value = types.value.includes(t) ? types.value.filter((x) => x !== t) : [...types.value, t]
}

const { min: SMIN, max: SMAX, step: SSTEP } = BUDGET_SLIDER
const lo = computed(() => minEuros.value ?? SMIN)
const hi = computed(() => maxEuros.value ?? SMAX)
const pct = (v: number) => ((v - SMIN) / (SMAX - SMIN)) * 100

function setLo(v: number) {
  const next = Math.min(v, hi.value - SSTEP)
  minEuros.value = next <= SMIN ? null : next
}
function setHi(v: number) {
  const next = Math.max(v, lo.value + SSTEP)
  maxEuros.value = next >= SMAX ? null : next
}
const eur = (v: number) => `${v.toLocaleString('es-ES')} €`
const budgetText = computed(() => `${eur(lo.value)} - ${maxEuros.value == null ? `${eur(SMAX)}+` : eur(hi.value)}`)

function toggle(cat: string) {
  categories.value = categories.value.includes(cat) ? categories.value.filter((c) => c !== cat) : [...categories.value, cat]
}
function togglePlatform(p: string) {
  platforms.value = platforms.value.includes(p) ? platforms.value.filter((x) => x !== p) : [...platforms.value, p]
}
// Solo las redes que aparecen en algún resultado (o ya elegidas): ofrecer una red que nadie tiene es ruido.
const platformOptions = computed(() => Object.entries(platformMeta)
  .map(([value, meta]) => ({ value, label: meta.label, count: props.platformCounts[value] ?? 0 }))
  .filter((o) => o.count > 0 || platforms.value.includes(o.value)))

// Categorías: se ven las más habituales y el resto bajo «Ver todas»; las elegidas se ven siempre, aunque
// caigan en la parte plegada. Antes eran más de 20 chips seguidos antes del presupuesto.
const CATEGORY_PREVIEW = 10
const showAllCategories = ref(false)
const visibleCategories = computed(() => (showAllCategories.value
  ? DISCOVERY_CATEGORIES
  : DISCOVERY_CATEGORIES.filter((c, i) => i < CATEGORY_PREVIEW || categories.value.includes(c))))
const hiddenCategoryCount = computed(() => DISCOVERY_CATEGORIES.length - visibleCategories.value.length)

// Criterios secundarios (red, tipo, respuesta, verificadas) plegados en «Más filtros»; abiertos si ya hay alguno aplicado.
const advancedActiveCount = computed(() => platforms.value.length + types.value.length + (response.value !== 'any' ? 1 : 0) + (verifiedOnly.value ? 1 : 0) + (withPackages.value ? 1 : 0))
const advancedOpen = ref(advancedActiveCount.value > 0)

const responseOptions: { value: ResponseFilter; label: string }[] = [
  { value: 'any', label: 'Cualquiera' },
  { value: '24', label: 'En menos de 24 h' },
  { value: '2', label: 'En menos de 2 h' }
]
</script>

<template>
  <div class="dfilters">
    <div class="dfilters__head">
      <h2 v-if="!hideTitle" class="dfilters__title">Filtros</h2>
      <span v-else />
      <button v-if="active" type="button" class="dfilters__clear" @click="$emit('clear')">Limpiar</button>
    </div>

    <fieldset class="dfilters__group">
      <legend class="dfilters__legend">Categorías</legend>
      <div class="dfilters__chips">
        <Chip v-for="cat in visibleCategories" :key="cat" :selected="categories.includes(cat)" @click="toggle(cat)">{{ cat }}</Chip>
      </div>
      <button v-if="hiddenCategoryCount > 0 || showAllCategories" type="button" class="dfilters__more" :aria-expanded="showAllCategories" data-categories-toggle @click="showAllCategories = !showAllCategories">
        {{ showAllCategories ? 'Ver menos' : `Ver todas (+${hiddenCategoryCount})` }}
      </button>
    </fieldset>

    <fieldset class="dfilters__group">
      <legend class="sr-only">{{ budgetLabel }}</legend>
      <div class="dfilters__legend dfilters__legend--row" aria-hidden="true"><span>{{ budgetLabel }}</span><span class="dfilters__value">{{ budgetText }}</span></div>
      <div class="dslider" :style="{ '--lo': `${pct(lo)}%`, '--hi': `${pct(hi)}%` }">
        <div class="dslider__track" />
        <input
          type="range" class="dslider__input" :min="SMIN" :max="SMAX" :step="SSTEP" :value="lo" aria-label="Presupuesto mínimo"
          :aria-valuetext="eur(lo)" @input="setLo(Number(($event.target as HTMLInputElement).value))"
        >
        <input
          type="range" class="dslider__input" :min="SMIN" :max="SMAX" :step="SSTEP" :value="hi" aria-label="Presupuesto máximo"
          :aria-valuetext="maxEuros == null ? 'sin límite' : eur(hi)" @input="setHi(Number(($event.target as HTMLInputElement).value))"
        >
      </div>
    </fieldset>

    <details class="dfilters__advanced" :open="advancedOpen" data-advanced-filters @toggle="advancedOpen = ($event.target as HTMLDetailsElement).open">
      <summary>Más filtros<span v-if="advancedActiveCount" class="badge badge--on-light dfilters__badge">{{ advancedActiveCount }}</span></summary>
      <div class="dfilters__advanced-body">
    <fieldset v-if="platformOptions.length" class="dfilters__group">
      <legend class="dfilters__legend">Plataforma</legend>
      <label v-for="o in platformOptions" :key="o.value" class="dcheck">
        <input type="checkbox" :checked="platforms.includes(o.value)" @change="togglePlatform(o.value)">
        <span class="dcheck__box" aria-hidden="true"><Icon name="ph:check-bold" class="size-3" /></span>
        <span class="dcheck__label">{{ o.label }}</span>
        <span class="dcheck__count">{{ o.count }}</span>
      </label>
    </fieldset>

    <fieldset v-if="brandFilters" class="dfilters__group">
      <legend class="dfilters__legend">Tipo de colaboración</legend>
      <div class="dfilters__chips">
        <Chip v-for="t in COLLAB_TYPES" :key="t.value" :selected="types.includes(t.value)" @click="toggleType(t.value)">{{ t.label }}</Chip>
      </div>
      <p class="dfilters__hint">Los formatos que cada marca dice ofrecer en su ficha.</p>
    </fieldset>

    <fieldset class="dfilters__group">
      <legend class="dfilters__legend">Respuesta</legend>
      <label v-for="o in responseOptions" :key="o.value" class="dcheck dcheck--radio">
        <input v-model="response" type="radio" name="discover-response" :value="o.value">
        <span class="dcheck__box" aria-hidden="true" />
        <span class="dcheck__label">{{ o.label }}</span>
      </label>
      <p class="dfilters__hint">Según lo que han tardado de verdad en contestar solicitudes. Si no hay datos, no aparecen al filtrar.</p>
    </fieldset>

    <label class="dswitch" data-filter-packages>
      <span>{{ brandFilters ? 'Solo con necesidades publicadas' : 'Solo con paquetes publicados' }}</span>
      <input v-model="withPackages" type="checkbox" role="switch">
      <span class="dswitch__track" aria-hidden="true"><span class="dswitch__thumb" /></span>
    </label>

    <label v-if="brandFilters" class="dswitch">
      <span>Solo marcas verificadas</span>
      <input v-model="verifiedOnly" type="checkbox" role="switch">
      <span class="dswitch__track" aria-hidden="true"><span class="dswitch__thumb" /></span>
    </label>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import { platformMeta } from '~/utils/mock-data'
import { BUDGET_SLIDER, type ResponseFilter } from '~/utils/discover-view'

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
}>()
defineEmits<{ clear: [] }>()
const categories = defineModel<string[]>('categories', { required: true })
const minEuros = defineModel<number | null>('min', { required: true })
const maxEuros = defineModel<number | null>('max', { required: true })
const platforms = defineModel<string[]>('platforms', { required: true })
const response = defineModel<ResponseFilter>('response', { required: true })

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

const responseOptions: { value: ResponseFilter; label: string }[] = [
  { value: 'any', label: 'Cualquiera' },
  { value: '24', label: 'En menos de 24 h' },
  { value: '2', label: 'En menos de 2 h' }
]
</script>

<template>
  <div class="dfilters">
    <div class="dfilters__head">
      <h2 class="dfilters__title">Filtros</h2>
      <button v-if="active" type="button" class="dfilters__clear" @click="$emit('clear')">Limpiar</button>
    </div>

    <fieldset class="dfilters__group">
      <legend class="dfilters__legend">Categorías</legend>
      <div class="dfilters__chips">
        <Chip v-for="cat in DISCOVERY_CATEGORIES" :key="cat" :selected="categories.includes(cat)" @click="toggle(cat)">{{ cat }}</Chip>
      </div>
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

    <fieldset v-if="platformOptions.length" class="dfilters__group">
      <legend class="dfilters__legend">Plataforma</legend>
      <label v-for="o in platformOptions" :key="o.value" class="dcheck">
        <input type="checkbox" :checked="platforms.includes(o.value)" @change="togglePlatform(o.value)">
        <span class="dcheck__box" aria-hidden="true"><Icon name="ph:check-bold" class="size-3" /></span>
        <span class="dcheck__label">{{ o.label }}</span>
        <span class="dcheck__count">{{ o.count }}</span>
      </label>
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
  </div>
</template>

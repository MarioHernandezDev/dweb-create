<script setup lang="ts">
import { DISCOVERY_CATEGORIES } from '~/utils/categories'

/** Filtros de Descubrir: categorías (varias a la vez) y presupuesto. Se aplican solos al cambiar. */
defineProps<{ active: boolean }>()
defineEmits<{ clear: [] }>()
const categories = defineModel<string[]>('categories', { required: true })
const minEuros = defineModel<number | null>('min', { required: true })
const maxEuros = defineModel<number | null>('max', { required: true })

function toggle(cat: string) {
  categories.value = categories.value.includes(cat) ? categories.value.filter((c) => c !== cat) : [...categories.value, cat]
}
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
      <legend class="dfilters__legend">Presupuesto</legend>
      <div class="grid grid-cols-2 gap-2">
        <BaseField label="Desde" v-slot="f">
          <BaseInput v-bind="f" v-model="minEuros" type="number" min="0" step="1" suffix="€" placeholder="Mín." />
        </BaseField>
        <BaseField label="Hasta" v-slot="f">
          <BaseInput v-bind="f" v-model="maxEuros" type="number" min="0" step="1" suffix="€" placeholder="Máx." />
        </BaseField>
      </div>
    </fieldset>
  </div>
</template>

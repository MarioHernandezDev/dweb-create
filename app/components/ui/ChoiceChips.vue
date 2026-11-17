<script setup lang="ts">
/**
 * Elección única entre pocas opciones, con icono: más rápida y visual que un desplegable cuando caben todas a la vista
 * (red social, formato, tipo). Grupo de radios accesible: flechas para moverse, un solo elemento en el orden de tabulación.
 */
interface Option { value: string; label: string; icon?: string }
const props = defineProps<{ options: Option[]; label: string }>()
const model = defineModel<string>({ required: true })

function onKey(e: KeyboardEvent) {
  const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!dir) return
  e.preventDefault()
  const i = props.options.findIndex((o) => o.value === model.value)
  const next = props.options[(i + dir + props.options.length) % props.options.length]
  if (!next) return
  model.value = next.value
  nextTick(() => (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
}
</script>

<template>
  <div class="choice" role="radiogroup" :aria-label="label" @keydown="onKey">
    <button
      v-for="o in options" :key="o.value" type="button" role="radio" class="choice__item"
      :aria-checked="model === o.value" :tabindex="model === o.value ? 0 : -1" @click="model = o.value"
    >
      <Icon v-if="o.icon" :name="o.icon" class="choice__icon" />
      {{ o.label }}
    </button>
  </div>
</template>

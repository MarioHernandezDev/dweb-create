<script setup lang="ts">
/**
 * Pestañas o selector de vista. El indicador se mueve con CSS a partir de dos
 * variables (--tab-count, --tab-index); aquí no se mide ningún elemento.
 * Admite flechas izquierda/derecha (patrón de pestañas WAI-ARIA).
 */
const props = defineProps<{ options: { value: string; label: string }[]; modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const index = computed(() => Math.max(0, props.options.findIndex((o) => o.value === props.modelValue)))

function move(step: number, event: KeyboardEvent) {
  const next = props.options[(index.value + step + props.options.length) % props.options.length]
  if (!next) return
  emit('update:modelValue', next.value)
  event.preventDefault()
  nextTick(() => (event.currentTarget as HTMLElement | null)?.parentElement?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
}
</script>

<template>
  <div class="tabs" role="tablist" :aria-label="label" :style="{ '--tab-count': options.length, '--tab-index': index }">
    <span class="tabs__indicator" aria-hidden="true" />
    <button
      v-for="opt in options" :key="opt.value" type="button" role="tab"
      class="tabs__tab" :aria-selected="modelValue === opt.value" :tabindex="modelValue === opt.value ? 0 : -1"
      @click="emit('update:modelValue', opt.value)"
      @keydown.right="move(1, $event)" @keydown.left="move(-1, $event)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

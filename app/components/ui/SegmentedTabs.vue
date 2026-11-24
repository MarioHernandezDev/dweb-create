<script setup lang="ts">
/**
 * Pestañas o selector de vista. El indicador se mueve con CSS a partir de dos
 * variables (--tab-count, --tab-index); aquí no se mide ningún elemento.
 * Admite flechas izquierda/derecha (patrón de pestañas WAI-ARIA).
 */
const props = defineProps<{ options: { value: string; label: string }[]; modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const el = ref<HTMLElement | null>(null)
const more = ref({ left: false, right: false })

/** Avisa con un degradado en el borde cuando hay pestañas fuera de la vista (móvil). */
function updateMore() {
  const t = el.value
  if (!t) return
  more.value = { left: t.scrollLeft > 4, right: t.scrollLeft + t.clientWidth < t.scrollWidth - 4 }
}

/** Desplaza solo la tira de pestañas (nunca la página) hasta que la elegida se vea entera. */
function revealSelected(smooth: boolean) {
  const t = el.value
  const s = t?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (!t || !s) return
  const left = s.offsetLeft - 8
  const right = s.offsetLeft + s.offsetWidth + 8
  if (left < t.scrollLeft) t.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' })
  else if (right > t.scrollLeft + t.clientWidth) t.scrollTo({ left: right - t.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
}

onMounted(() => {
  updateMore()
  revealSelected(false)
  window.addEventListener('resize', updateMore)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateMore))
watch(() => props.modelValue, () => nextTick(() => revealSelected(true)))

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
  <div ref="el" class="tabs" @scroll.passive="updateMore" role="tablist" :class="[more.left && 'has-more-left', more.right && 'has-more-right']" :aria-label="label" :style="{ '--tab-count': options.length, '--tab-index': index }">
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

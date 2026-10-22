<script setup lang="ts">
const props = defineProps<{ options: { value: string; label: string }[]; modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const btnRefs = ref<(HTMLElement | null)[]>([])
const indicatorStyle = ref({ width: '0px', transform: 'translateX(0px)' })

function setBtnRef(el: Element | null, i: number) {
  btnRefs.value[i] = el as HTMLElement | null
}

function updateIndicator() {
  const idx = props.options.findIndex((o) => o.value === props.modelValue)
  const el = btnRefs.value[idx]
  if (!el) return
  indicatorStyle.value = { width: `${el.offsetWidth}px`, transform: `translateX(${el.offsetLeft}px)` }
}

onMounted(() => nextTick(updateIndicator))
watch(() => props.modelValue, () => nextTick(updateIndicator))
watch(() => props.options, () => nextTick(updateIndicator), { deep: true })
</script>

<template>
  <div class="relative inline-flex items-center gap-1 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] p-1">
    <span
      class="absolute top-1 bottom-1 left-0 rounded-[calc(var(--radius-xs)-4px)] bg-[var(--color-ink-raised)] shadow-sm transition-[transform,width] duration-300 ease-[var(--ease-spring)]"
      :style="indicatorStyle"
      aria-hidden="true"
    />
    <button
      v-for="(opt, i) in options" :key="opt.value" type="button"
      :ref="(el) => setBtnRef(el as Element | null, i)"
      class="relative z-10 px-3.5 h-8 rounded-[calc(var(--radius-xs)-4px)] text-[0.8125rem] font-medium transition-colors duration-150"
      :class="modelValue === opt.value
        ? 'text-[var(--color-text)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-ink-raised)]/60'"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

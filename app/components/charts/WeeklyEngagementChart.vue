<script setup lang="ts">
import type { SparklinePoint } from '~/types'

const props = withDefaults(
  defineProps<{ data: SparklinePoint[]; height?: number }>(),
  { height: 160 }
)

const width = 560
const padding = 12
const activeIndex = ref<number | null>(null)

const values = computed(() => props.data.map((d) => d.value))
const min = computed(() => Math.min(...values.value))
const max = computed(() => Math.max(...values.value))
const span = computed(() => max.value - min.value || 1)
const stepX = computed(() => (width - padding * 2) / (props.data.length - 1))

function yFor(v: number) {
  return props.height - padding - ((v - min.value) / span.value) * (props.height - padding * 2)
}

const points = computed(() =>
  props.data.map((d, i) => ({ x: padding + i * stepX.value, y: yFor(d.value), label: d.label, value: d.value }))
)

const linePath = computed(() => `M${points.value.map((p) => `${p.x},${p.y}`).join(' L')}`)
const areaPath = computed(
  () => `M${padding},${props.height} L${points.value.map((p) => `${p.x},${p.y}`).join(' L')} L${width - padding},${props.height} Z`
)

const active = computed(() => (activeIndex.value !== null ? points.value[activeIndex.value] : null))

function setFromClientX(clientX: number, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect()
  const ratio = (clientX - rect.left) / rect.width
  const x = ratio * width
  let nearest = 0
  let best = Infinity
  points.value.forEach((p, i) => {
    const d = Math.abs(p.x - x)
    if (d < best) {
      best = d
      nearest = i
    }
  })
  activeIndex.value = nearest
}

function onMove(e: PointerEvent) {
  setFromClientX(e.clientX, e.currentTarget as SVGSVGElement)
}

function onLeave() {
  activeIndex.value = null
}

function onKeydown(e: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return
  e.preventDefault()
  const current = activeIndex.value ?? 0
  const next = e.key === 'ArrowLeft' ? Math.max(0, current - 1) : Math.min(points.value.length - 1, current + 1)
  activeIndex.value = next
}
</script>

<template>
  <div class="relative select-none">
    <svg
      :viewBox="`0 0 ${width} ${height}`" class="w-full touch-none" :height="height" role="img"
      aria-label="Engagement diario de la semana" tabindex="0"
      @pointermove="onMove" @pointerleave="onLeave" @keydown="onKeydown"
    >
      <line
        v-for="frac in [0, 0.5, 1]" :key="frac"
        :x1="padding" :x2="width - padding"
        :y1="padding + frac * (height - padding * 2)" :y2="padding + frac * (height - padding * 2)"
        stroke="var(--color-hairline)" stroke-width="1"
      />
      <path :d="areaPath" fill="var(--color-chart-primary)" fill-opacity="0.1" stroke="none" />
      <path :d="linePath" fill="none" stroke="var(--color-chart-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

      <line
        v-if="active" :x1="active.x" :x2="active.x" :y1="padding" :y2="height - padding"
        stroke="var(--color-text-faint)" stroke-width="1" stroke-dasharray="3 3"
      />
      <circle
        v-for="(p, i) in points" :key="i" :cx="p.x" :cy="p.y"
        :r="activeIndex === i ? 5 : 4" fill="var(--color-chart-primary)"
        stroke="var(--color-ink-raised)" stroke-width="2"
      />
    </svg>

    <div
      v-if="active"
      class="pointer-events-none absolute top-0 -translate-y-full -translate-x-1/2 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline-strong)] px-3 py-2 shadow-[var(--shadow-float)] whitespace-nowrap"
      :style="{ left: `${(active.x / width) * 100}%` }"
    >
      <p class="font-sans font-semibold text-[var(--color-text)] text-sm" style="font-variant-numeric: proportional-nums">{{ active.value }} pts</p>
      <p class="text-[0.6875rem] text-[var(--color-text-muted)]">{{ active.label }}</p>
    </div>
  </div>
</template>

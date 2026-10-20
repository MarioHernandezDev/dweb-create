<script setup lang="ts">
export interface BarSeries {
  label: string
  color: string
  values: number[]
}

const props = withDefaults(
  defineProps<{
    labels: string[]
    series: BarSeries[]
    height?: number
    formatValue?: (v: number) => string
  }>(),
  { height: 180, formatValue: (v: number) => String(v) }
)

const width = 560
const padding = 12
const axisGutter = 20
const hoveredIndex = ref<number | null>(null)

const plotHeight = computed(() => props.height - axisGutter)
const maxValue = computed(() => Math.max(1, ...props.series.flatMap((s) => s.values)))
const groupWidth = computed(() => (width - padding * 2) / props.labels.length)

const BAR_GAP = 2
const GROUP_INSET = 6

function barWidth() {
  const usable = groupWidth.value - GROUP_INSET * 2 - BAR_GAP * (props.series.length - 1)
  return Math.max(2, usable / props.series.length)
}

function barHeight(value: number) {
  return (value / maxValue.value) * (plotHeight.value - padding)
}

function roundedTopRectPath(x: number, y: number, w: number, h: number, radius: number) {
  if (h <= 0) return ''
  const r = Math.min(radius, w / 2, h)
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`
}

const bars = computed(() => {
  const bw = barWidth()
  return props.labels.map((label, groupIndex) => {
    const groupX = padding + groupIndex * groupWidth.value + GROUP_INSET
    const items = props.series.map((s, seriesIndex) => {
      const value = s.values[groupIndex] ?? 0
      const h = barHeight(value)
      const x = groupX + seriesIndex * (bw + BAR_GAP)
      const y = plotHeight.value - h
      return { color: s.color, value, path: roundedTopRectPath(x, y, bw, h, 4) }
    })
    return { label, centerX: padding + groupIndex * groupWidth.value + groupWidth.value / 2, items }
  })
})
</script>

<template>
  <div class="relative select-none">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full" :height="height" role="img" :aria-label="`Gráfico de barras: ${labels.join(', ')}`">
      <line
        v-for="frac in [0, 0.5, 1]" :key="frac"
        :x1="padding" :x2="width - padding"
        :y1="padding + frac * (plotHeight - padding * 2)" :y2="padding + frac * (plotHeight - padding * 2)"
        stroke="var(--color-hairline)" stroke-width="1"
      />

      <g v-for="(group, i) in bars" :key="group.label">
        <path v-for="(bar, j) in group.items" :key="j" :d="bar.path" :fill="bar.color" />
        <rect
          :x="padding + i * groupWidth" y="0" :width="groupWidth" :height="plotHeight"
          fill="transparent" @pointerenter="hoveredIndex = i" @pointerleave="hoveredIndex = null"
        />
        <text
          :x="group.centerX" :y="height - 4" text-anchor="middle"
          fill="var(--color-text-faint)" font-size="10"
        >
          {{ group.label }}
        </text>
      </g>
    </svg>

    <div
      v-if="hoveredIndex !== null"
      class="pointer-events-none absolute top-0 -translate-x-1/2 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline-strong)] px-3 py-2 shadow-[var(--shadow-float)] whitespace-nowrap z-10"
      :style="{ left: `${(bars[hoveredIndex]!.centerX / width) * 100}%` }"
    >
      <p class="text-[0.6875rem] text-[var(--color-text-muted)] mb-1">{{ bars[hoveredIndex]!.label }}</p>
      <p v-for="(bar, j) in bars[hoveredIndex]!.items" :key="j" class="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--color-text)]">
        <span class="size-2 rounded-full shrink-0" :style="{ background: bar.color }" />
        {{ formatValue(bar.value) }}
        <span v-if="series[j]" class="text-[var(--color-text-faint)] font-normal">{{ series[j]!.label }}</span>
      </p>
    </div>

    <div v-if="series.length > 1" class="flex items-center gap-4 mt-2 justify-center">
      <span v-for="s in series" :key="s.label" class="inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-text-muted)]">
        <span class="size-2 rounded-full shrink-0" :style="{ background: s.color }" />
        {{ s.label }}
      </span>
    </div>
  </div>
</template>

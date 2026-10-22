<script setup lang="ts">
/**
 * Línea de evolución genérica para series diarias largas (28 días, no los
 * 7 fijos de WeeklyEngagementChart.vue, que por eso no se reutiliza aquí
 * tal cual) — una sola magnitud por gráfica a propósito: dos medidas de
 * escala distinta (vistas vs. suscriptores) nunca comparten eje, cada una
 * tiene su propia instancia de este componente.
 */
const props = withDefaults(
  defineProps<{ data: { label: string; value: number }[]; height?: number; formatValue?: (v: number) => string }>(),
  { height: 160, formatValue: (v: number) => String(v) }
)

const width = 560
const padding = 12
const activeIndex = ref<number | null>(null)

const values = computed(() => props.data.map((d) => d.value))
const min = computed(() => Math.min(0, ...values.value))
const max = computed(() => Math.max(...values.value, 1))
const span = computed(() => max.value - min.value || 1)
const stepX = computed(() => (width - padding * 2) / Math.max(1, props.data.length - 1))

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

// Con series largas (28 puntos) un marcador/etiqueta por punto sería
// ilegible — solo se marcan ~5 ticks repartidos, selectivos a propósito.
const tickIndices = computed(() => {
  const n = props.data.length
  if (n <= 5) return props.data.map((_, i) => i)
  const count = 5
  return Array.from({ length: count }, (_, i) => Math.round((i * (n - 1)) / (count - 1)))
})

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
      aria-label="Evolución diaria" tabindex="0"
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
        v-if="active" :cx="active.x" :cy="active.y" r="5"
        fill="var(--color-chart-primary)" stroke="var(--color-ink-raised)" stroke-width="2"
      />

      <text
        v-for="i in tickIndices" :key="i" :x="points[i]!.x" :y="height - 2" text-anchor="middle"
        fill="var(--color-text-faint)" font-size="10"
      >
        {{ points[i]!.label }}
      </text>
    </svg>

    <div
      v-if="active"
      class="pointer-events-none absolute top-0 -translate-y-full -translate-x-1/2 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline-strong)] px-3 py-2 shadow-[var(--shadow-float)] whitespace-nowrap"
      :style="{ left: `${(active.x / width) * 100}%` }"
    >
      <p class="font-sans font-semibold text-[var(--color-text)] text-sm" style="font-variant-numeric: proportional-nums">{{ formatValue(active.value) }}</p>
      <p class="text-[0.6875rem] text-[var(--color-text-muted)]">{{ active.label }}</p>
    </div>
  </div>
</template>

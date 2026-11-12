<script setup lang="ts">
/**
 * Barras divergentes alrededor de cero — para series de "ganancia/pérdida"
 * por día (suscriptores netos), no de magnitud pura (para eso está
 * EvolutionLineChart.vue). Color por signo, no por categoría: verde/rojo
 * son los tonos de estado ya reservados en la app (publicado/alerta), aquí
 * reutilizados para "positivo/negativo" — es el mismo tipo de señal
 * (polaridad), nunca una serie categórica más.
 */
const props = withDefaults(
  defineProps<{ data: { label: string; value: number }[]; height?: number; formatValue?: (v: number) => string }>(),
  { height: 120, formatValue: (v: number) => String(v) }
)

const width = 560
const padding = 12
const axisGutter = 16
const hoveredIndex = ref<number | null>(null)

const plotHeight = computed(() => props.height - axisGutter)
const maxAbs = computed(() => Math.max(1, ...props.data.map((d) => Math.abs(d.value))))
const zeroY = computed(() => padding + (plotHeight.value - padding * 2) / 2)
const halfSpan = computed(() => (plotHeight.value - padding * 2) / 2)

const slotWidth = computed(() => (width - padding * 2) / Math.max(1, props.data.length))
const BAR_GAP = 1.5

function barRect(value: number, groupX: number) {
  const w = Math.max(1, slotWidth.value - BAR_GAP * 2)
  const h = (Math.abs(value) / maxAbs.value) * halfSpan.value
  const x = groupX + BAR_GAP
  const y = value >= 0 ? zeroY.value - h : zeroY.value
  return { x, y, w, h: Math.max(h, value === 0 ? 0 : 1.5) }
}

const bars = computed(() =>
  props.data.map((d, i) => {
    const groupX = padding + i * slotWidth.value
    return { ...barRect(d.value, groupX), value: d.value, label: d.label, centerX: groupX + slotWidth.value / 2 }
  })
)
</script>

<template>
  <div class="relative select-none">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full" :height="height" role="img" aria-label="Variación neta diaria">
      <line :x1="padding" :x2="width - padding" :y1="zeroY" :y2="zeroY" stroke="var(--color-hairline-strong)" stroke-width="1" />

      <g v-for="(bar, i) in bars" :key="i">
        <rect
          :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h" rx="2"
          :fill="bar.value >= 0 ? 'var(--color-status-published)' : 'var(--color-status-alert)'"
        />
        <rect
          :x="padding + i * slotWidth" y="0" :width="slotWidth" :height="plotHeight"
          fill="transparent" @pointerenter="hoveredIndex = i" @pointerleave="hoveredIndex = null"
        />
      </g>
    </svg>

    <div
      v-if="hoveredIndex !== null"
      class="pointer-events-none absolute top-0 -translate-x-1/2 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline-strong)] px-3 py-2 shadow-[var(--shadow-float)] whitespace-nowrap z-10"
      :style="{ left: `${(bars[hoveredIndex]!.centerX / width) * 100}%` }"
    >
      <p
        class="font-sans font-semibold text-sm" style="font-variant-numeric: proportional-nums"
        :style="{ color: bars[hoveredIndex]!.value >= 0 ? 'var(--color-status-published)' : 'var(--color-status-alert)' }"
      >
        {{ bars[hoveredIndex]!.value > 0 ? '+' : '' }}{{ formatValue(bars[hoveredIndex]!.value) }}
      </p>
      <p class="text-micro text-[var(--color-text-muted)]">{{ bars[hoveredIndex]!.label }}</p>
    </div>
  </div>
</template>

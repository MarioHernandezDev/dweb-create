<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { formatCompactNumber } from '~/utils/mock-data'
import { formatChartValue, formatHours, formatSigned, type ChartMetric, type ChartPoint, type ChartSeries } from '~/utils/youtube-period-view'

/**
 * Gráfica de evolución diaria del dashboard de YouTube. SVG propio, sin
 * librería. Reglas:
 *  - Un día sin dato es un HUECO (la línea se corta), nunca un cero.
 *  - El periodo anterior se pinta discontinuo y alineado día a día; el
 *    tooltip enseña la fecha y el valor de los dos.
 *  - Eje Y con valores legibles; una sola magnitud por gráfica (escalas
 *    distintas no comparten eje: cada métrica tiene su pestaña).
 *  - Accesible: foco con teclado (←/→) y descripción del punto activo en una
 *    región `aria-live`.
 *  - Responsive de verdad: se dibuja al ANCHO REAL del contenedor (no se encoge
 *    un lienzo fijo), así los números de los ejes mantienen su tamaño en
 *    móvil. En servidor (ancho 0) usa un ancho por defecto hasta medir.
 */
const props = withDefaults(defineProps<{ series: ChartSeries; metric: ChartMetric; showCompare: boolean; height?: number }>(), { height: 260 })

const root = ref<HTMLElement | null>(null)
const { width: measured } = useElementSize(root)
const W = computed(() => (measured.value >= 200 ? Math.round(measured.value) : 720))
const narrow = computed(() => W.value < 480)
const H = computed(() => (narrow.value ? Math.min(props.height, 230) : props.height))
const M = computed(() => ({ left: narrow.value ? 44 : 56, right: 12, top: 14, bottom: 28 }))
const innerW = computed(() => W.value - M.value.left - M.value.right)
const innerH = computed(() => H.value - M.value.top - M.value.bottom)

const previous = computed<ChartPoint[] | null>(() => (props.showCompare ? props.series.previous : null))
const n = computed(() => props.series.current.length)
/** Cambia al cambiar de métrica o de periodo: el SVG se vuelve a montar y la línea se dibuja otra vez. */
const drawKey = computed(() => `${props.metric}|${n.value}|${props.series.current[0]?.date ?? ''}`)

function niceStep(range: number): number {
  const pow = 10 ** Math.floor(Math.log10(range))
  const frac = range / pow
  return (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * pow
}

const domain = computed(() => {
  const values = [...props.series.current, ...(previous.value ?? [])].map((p) => p.value).filter((v): v is number => v !== null)
  let min = Math.min(0, ...values)
  let max = Math.max(0, ...values)
  if (max === min) max = min + 1
  const step = niceStep((max - min) / 4)
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { min, max, ticks }
})

const xFor = (i: number) => M.value.left + (n.value <= 1 ? innerW.value / 2 : (i * innerW.value) / (n.value - 1))
const yFor = (v: number) => M.value.top + ((domain.value.max - v) / (domain.value.max - domain.value.min)) * innerH.value
const baseY = computed(() => yFor(Math.min(Math.max(0, domain.value.min), domain.value.max)))

/** Divide la serie en tramos continuos: los huecos cortan la línea. */
function runs(points: ChartPoint[]) {
  const out: { x: number; y: number }[][] = []
  let run: { x: number; y: number }[] = []
  points.forEach((p, i) => {
    if (p.value === null) {
      if (run.length) out.push(run)
      run = []
    } else {
      run.push({ x: xFor(i), y: yFor(p.value) })
    }
  })
  if (run.length) out.push(run)
  return out
}

const currentRuns = computed(() => runs(props.series.current))
const previousRuns = computed(() => (previous.value ? runs(previous.value) : []))
const toLine = (r: { x: number; y: number }[]) => `M${r.map((p) => `${p.x},${p.y}`).join(' L')}`
const toArea = (r: { x: number; y: number }[]) => `${toLine(r)} L${r[r.length - 1]!.x},${baseY.value} L${r[0]!.x},${baseY.value} Z`

function tickLabel(v: number): string {
  if (props.metric === 'watch') return formatHours(v)
  if (props.metric === 'subscribers') return formatSigned(v, (x) => formatCompactNumber(x))
  return formatCompactNumber(v)
}

const xTicks = computed(() => {
  if (n.value <= 1) return [0]
  const count = Math.min(narrow.value ? 3 : 5, n.value)
  return Array.from({ length: count }, (_, i) => Math.round((i * (n.value - 1)) / (count - 1)))
})

// --- Interacción -------------------------------------------------------------------------------------------
const activeIndex = ref<number | null>(null)

function setFromClientX(clientX: number, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * W.value
  const raw = n.value <= 1 ? 0 : ((x - M.value.left) / innerW.value) * (n.value - 1)
  activeIndex.value = Math.max(0, Math.min(n.value - 1, Math.round(raw)))
}
function onMove(e: PointerEvent) {
  setFromClientX(e.clientX, e.currentTarget as SVGSVGElement)
}
function onKeydown(e: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) return
  e.preventDefault()
  if (e.key === 'Escape') return void (activeIndex.value = null)
  const cur = activeIndex.value ?? (e.key === 'ArrowRight' ? -1 : n.value)
  activeIndex.value = Math.max(0, Math.min(n.value - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)))
}

const active = computed(() => {
  const i = activeIndex.value
  if (i === null || i >= n.value) return null
  const cur = props.series.current[i]!
  const prev = previous.value?.[i] ?? null
  return { i, x: xFor(i), cur, prev }
})

const valueText = (p: ChartPoint | null) => (p && p.value !== null ? formatChartValue(props.metric, p.value) : 'sin dato')
const spoken = computed(() => {
  const a = active.value
  if (!a) return ''
  return `${a.cur.label}: ${valueText(a.cur)}${a.prev ? `. Periodo anterior, ${a.prev.label}: ${valueText(a.prev)}` : ''}`
})
</script>

<template>
  <div ref="root" class="relative select-none">
    <svg
      :viewBox="`0 0 ${W} ${H}`" class="w-full touch-none" :height="H" role="img" tabindex="0"
      aria-label="Evolución diaria del canal. Usa las flechas del teclado para recorrer los días."
      @pointermove="onMove" @pointerleave="activeIndex = null" @keydown="onKeydown" @blur="activeIndex = null"
    >
      <!-- Cuadrícula y eje Y -->
      <g v-for="t in domain.ticks" :key="t">
        <line :x1="M.left" :x2="W - M.right" :y1="yFor(t)" :y2="yFor(t)" :stroke="t === 0 ? 'var(--color-hairline-strong)' : 'var(--color-hairline)'" stroke-width="1" />
        <text :x="M.left - 8" :y="yFor(t) + 3.5" text-anchor="end" fill="var(--color-text-faint)" font-size="11">{{ tickLabel(t) }}</text>
      </g>

      <!-- Periodo anterior: discontinuo, sin relleno -->
      <path
        v-for="(r, i) in previousRuns.filter((r) => r.length > 1)" :key="`p${i}`" :d="toLine(r)"
        fill="none" stroke="var(--color-text-faint)" stroke-width="1.75" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round"
      />
      <circle v-for="(r, i) in previousRuns.filter((r) => r.length === 1)" :key="`pd${i}`" :cx="r[0]!.x" :cy="r[0]!.y" r="2.5" fill="var(--color-text-faint)" />

      <!-- Periodo actual: área suave + línea; cada tramo continuo por separado -->
      <g :key="drawKey">
        <template v-for="(r, i) in currentRuns" :key="`c${i}`">
          <path v-if="r.length > 1" class="yt-fade" :d="toArea(r)" fill="var(--color-chart-primary)" fill-opacity="0.1" stroke="none" />
          <path v-if="r.length > 1" class="yt-draw" pathLength="1" :d="toLine(r)" fill="none" stroke="var(--color-chart-primary)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-else :cx="r[0]!.x" :cy="r[0]!.y" r="3" fill="var(--color-chart-primary)" />
        </template>
      </g>

      <!-- Punto activo -->
      <template v-if="active">
        <line :x1="active.x" :x2="active.x" :y1="M.top" :y2="M.top + innerH" stroke="var(--color-text-faint)" stroke-width="1" stroke-dasharray="3 3" />
        <circle v-if="active.prev && active.prev.value !== null" :cx="active.x" :cy="yFor(active.prev.value)" r="4" fill="var(--color-ink-raised)" stroke="var(--color-text-faint)" stroke-width="2" />
        <circle v-if="active.cur.value !== null" :cx="active.x" :cy="yFor(active.cur.value)" r="5" fill="var(--color-chart-primary)" stroke="var(--color-ink-raised)" stroke-width="2" />
      </template>

      <!-- Eje X -->
      <text v-for="i in xTicks" :key="`x${i}`" :x="xFor(i)" :y="H - 8" :text-anchor="i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'" fill="var(--color-text-faint)" font-size="11">
        {{ series.current[i]!.label }}
      </text>
    </svg>

    <div
      v-if="active"
      class="pointer-events-none absolute top-1 -translate-x-1/2 rounded-[var(--radius-xs)] bg-[var(--color-paper)] border border-[var(--color-hairline-strong)] shadow-md px-3 py-2 min-w-[8.5rem]"
      :style="{ left: `${Math.min(84, Math.max(16, (active.x / W) * 100))}%` }"
    >
      <p class="text-[0.6875rem] text-[var(--color-text-muted)]">{{ active.cur.label }}</p>
      <p class="font-semibold text-[var(--color-text)] text-sm" style="font-variant-numeric: proportional-nums">{{ valueText(active.cur) }}</p>
      <template v-if="active.prev">
        <p class="mt-1.5 text-[0.6875rem] text-[var(--color-text-faint)]">{{ active.prev.label }} (anterior)</p>
        <p class="text-[0.8125rem] text-[var(--color-text-muted)]" style="font-variant-numeric: proportional-nums">{{ valueText(active.prev) }}</p>
      </template>
    </div>

    <p class="sr-only" aria-live="polite">{{ spoken }}</p>
  </div>
</template>

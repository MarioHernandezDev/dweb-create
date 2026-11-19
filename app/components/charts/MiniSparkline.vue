<script setup lang="ts">
const props = withDefaults(
  defineProps<{ values: number[]; width?: number; height?: number; color?: string }>(),
  { width: 72, height: 24, color: 'var(--color-chart-primary)' }
)

const points = computed(() => {
  const min = Math.min(...props.values)
  const max = Math.max(...props.values)
  const span = max - min || 1
  const stepX = props.width / (props.values.length - 1)
  return props.values.map((v, i) => {
    const x = i * stepX
    const y = props.height - ((v - min) / span) * (props.height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
})

const linePath = computed(() => `M${points.value.join(' L')}`)
const areaPath = computed(() => `M0,${props.height} L${points.value.join(' L')} L${props.width},${props.height} Z`)
const lastPoint = computed(() => points.value[points.value.length - 1]?.split(',').map(Number) ?? [0, 0])
</script>

<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
    <path :d="areaPath" :fill="color" fill-opacity="0.1" stroke="none" />
    <path :d="linePath" fill="none" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle :cx="lastPoint[0]" :cy="lastPoint[1]" r="4" :fill="color" :stroke="`var(--color-ink-raised)`" stroke-width="2" />
  </svg>
</template>

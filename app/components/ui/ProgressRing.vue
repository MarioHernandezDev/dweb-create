<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value: number // 0-100
    size?: number
    stroke?: number
  }>(),
  { size: 96, stroke: 9 }
)

const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

// Arranca en 0 y se anima hasta el valor real al montar, como una barra que "se llena".
const animatedValue = ref(0)
onMounted(() => {
  requestAnimationFrame(() => { animatedValue.value = props.value })
})
watch(() => props.value, (v) => { animatedValue.value = v })

const offset = computed(() => circumference.value * (1 - animatedValue.value / 100))

// Meter: el relleno porta la severidad (alerta -> producción -> publicado).
const color = computed(() => {
  if (props.value < 45) return 'var(--color-status-alert)'
  if (props.value < 72) return 'var(--color-status-production)'
  return 'var(--color-status-published)'
})
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        :cx="size / 2" :cy="size / 2" :r="radius"
        fill="none" :stroke="color" stroke-opacity="0.18" :stroke-width="stroke"
      />
      <circle
        :cx="size / 2" :cy="size / 2" :r="radius"
        fill="none" :stroke="color" :stroke-width="stroke" stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="transition-[stroke-dashoffset] duration-[900ms] ease-[var(--ease-spring)]"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="font-sans font-semibold" style="font-variant-numeric: proportional-nums" :style="{ fontSize: `${size * 0.28}px`, color }">
        {{ Math.round(value) }}
      </span>
    </div>
  </div>
</template>

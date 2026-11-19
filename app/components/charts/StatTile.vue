<script setup lang="ts">
/** Tarjeta de cifra: la cifra es la protagonista. `tint` permite que un grupo de cifras no sea un bloque de tarjetas idénticas. */
const props = defineProps<{
  label: string
  value: string
  deltaPct?: number
  goodDirection?: 'up' | 'down'
  trend?: number[]
  tint?: 'voltio' | 'mantequilla' | 'menta' | 'cielo' | 'rosa'
  large?: boolean
}>()

const deltaIsGood = computed(() => {
  if (props.deltaPct === undefined) return null
  const positive = props.deltaPct >= 0
  return props.goodDirection === 'down' ? !positive : positive
})
</script>

<template>
  <BaseCard :tint="tint" class="card--stat">
    <p class="stat__label">{{ label }}</p>
    <div class="mt-1 flex items-end justify-between gap-3">
      <p class="stat__value" :class="large && 'stat__value--lg'">{{ value }}</p>
      <MiniSparkline v-if="trend" :values="trend" class="mb-0.5" />
    </div>
    <p v-if="deltaPct !== undefined" class="stat__delta" :class="deltaIsGood ? 'stat__delta--good' : 'stat__delta--bad'">
      <Icon :name="deltaPct >= 0 ? 'ph:trend-up-bold' : 'ph:trend-down-bold'" class="size-4" />
      {{ deltaPct >= 0 ? '+' : '' }}{{ deltaPct.toFixed(1) }}%
      <span class="font-normal text-[var(--text-muted)]">vs. semana pasada</span>
    </p>
  </BaseCard>
</template>

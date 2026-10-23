<script setup lang="ts">
const props = defineProps<{
  label: string
  value: string
  deltaPct?: number
  goodDirection?: 'up' | 'down'
  trend?: number[]
}>()

const deltaIsGood = computed(() => {
  if (props.deltaPct === undefined) return null
  const positive = props.deltaPct >= 0
  return props.goodDirection === 'down' ? !positive : positive
})
</script>

<template>
  <!-- Spine neutra en vez de una card más del mismo molde blanco+sombra:
       la cifra es la protagonista, no la caja que la rodea. -->
  <div class="flex rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper)] overflow-hidden">
    <div class="w-[3px] shrink-0 bg-[var(--color-slate)]" />
    <div class="min-w-0 flex-1 p-5">
      <p class="text-[0.8125rem] text-[var(--color-text-muted)]">{{ label }}</p>
      <div class="mt-2 flex items-end justify-between gap-3">
        <p class="font-display text-[1.875rem] leading-none text-[var(--color-text)]" style="font-variant-numeric: proportional-nums">
          {{ value }}
        </p>
        <MiniSparkline v-if="trend" :values="trend" class="mb-0.5" />
      </div>
      <p
        v-if="deltaPct !== undefined"
        class="mt-2 inline-flex items-center gap-1 text-[0.8125rem] font-medium"
        :style="{ color: deltaIsGood ? 'var(--color-status-published)' : 'var(--color-status-alert)' }"
      >
        <Icon :name="deltaPct >= 0 ? 'ph:trend-up-bold' : 'ph:trend-down-bold'" class="size-3.5" />
        {{ deltaPct >= 0 ? '+' : '' }}{{ deltaPct.toFixed(1) }}%
        <span class="text-[var(--color-text-faint)] font-normal">vs. semana pasada</span>
      </p>
    </div>
  </div>
</template>

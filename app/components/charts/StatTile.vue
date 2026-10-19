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
  <BaseCard radius="md" padding="md">
    <p class="text-[0.8125rem] text-[var(--color-text-muted)]">{{ label }}</p>
    <div class="mt-2 flex items-end justify-between gap-3">
      <p class="font-sans font-semibold text-[1.75rem] leading-none text-[var(--color-text)]" style="font-variant-numeric: proportional-nums">
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
  </BaseCard>
</template>

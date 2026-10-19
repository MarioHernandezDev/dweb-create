<script setup lang="ts">
import type { TrendSuggestion } from '~/types'
import { platformMeta } from '~/utils/mock-data'

defineProps<{ trend: TrendSuggestion }>()
</script>

<template>
  <BaseCard radius="md" padding="md" interactive>
    <div class="flex items-center justify-between gap-3">
      <span class="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-text-muted)]">
        <Icon :name="platformMeta[trend.platform].icon" class="size-3.5" :style="{ color: platformMeta[trend.platform].colorVar }" />
        {{ platformMeta[trend.platform].label }}
      </span>
      <span class="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[var(--color-status-published)]">
        <Icon name="ph:trend-up-bold" class="size-3.5" />
        +{{ trend.growthPct }}%
      </span>
    </div>

    <p class="mt-2.5 text-[0.9375rem] font-medium text-[var(--color-text)] leading-snug">{{ trend.topic }}</p>
    <p class="mt-1 text-[0.8125rem] text-[var(--color-text-muted)]">{{ trend.format }}</p>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <span v-for="tag in trend.hashtags" :key="tag" class="text-[0.75rem] text-[var(--color-text-faint)]">{{ tag }}</span>
    </div>

    <div class="mt-3 pt-3 border-t border-[var(--color-hairline)] flex items-center justify-between">
      <span class="text-[0.75rem] text-[var(--color-text-faint)]">Puntuación de tendencia</span>
      <span class="text-[0.875rem] font-semibold text-[var(--color-text)]" style="font-variant-numeric: proportional-nums">{{ trend.trendScore }}</span>
    </div>
  </BaseCard>
</template>

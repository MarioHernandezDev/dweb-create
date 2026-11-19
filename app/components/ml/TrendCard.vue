<script setup lang="ts">
import type { TrendSuggestion } from '~/types'
import { platformMeta } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'

defineProps<{ trend: TrendSuggestion }>()
defineEmits<{ use: [trend: TrendSuggestion]; dismiss: [trend: TrendSuggestion] }>()
</script>

<template>
  <BaseCard radius="md" padding="md" class="relative flex flex-col h-full">
    <button
      type="button" aria-label="Descartar esta idea"
      class="absolute top-3 right-3 flex items-center justify-center size-6 rounded-full text-[var(--color-text-faint)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-text)]"
      @click="$emit('dismiss', trend)"
    >
      <Icon name="ph:x-bold" class="size-3.5" />
    </button>

    <div class="flex items-center gap-3 pr-8">
      <span class="inline-flex items-center gap-1.5 text-micro font-medium text-[var(--color-text-muted)]">
        <Icon :name="platformMeta[trend.platform].icon" class="size-3.5" :style="{ color: platformMeta[trend.platform].colorVar }" />
        {{ platformMeta[trend.platform].label }}
      </span>
      <span class="inline-flex items-center gap-1 text-micro font-medium text-[var(--color-status-published)]">
        <Icon name="ph:trend-up-bold" class="size-3.5" />
        +{{ trend.growthPct }}%
      </span>
    </div>

    <p class="mt-2.5 text-base font-medium text-[var(--color-text)] leading-snug">{{ trend.topic }}</p>
    <p class="mt-1 text-sm text-[var(--color-text-muted)]">{{ trend.format }}</p>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <span v-for="tag in trend.hashtags" :key="tag" class="text-micro text-[var(--color-text-faint)]">{{ tag }}</span>
    </div>

    <div class="mt-3 pt-3 border-t border-[var(--color-hairline)] flex items-center justify-between">
      <span class="text-micro text-[var(--color-text-faint)]">Puntuación {{ trend.trendScore }} · {{ relativeTime(trend.detectedAt) }}</span>
    </div>

    <BaseButton variant="secondary" size="sm" class="w-full mt-4" icon="ph:plus-bold" @click="$emit('use', trend)">
      Usar esta idea
    </BaseButton>
  </BaseCard>
</template>

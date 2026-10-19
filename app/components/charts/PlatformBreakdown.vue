<script setup lang="ts">
import type { MetricSummary } from '~/types'
import { platformMeta, formatCompactNumber } from '~/utils/mock-data'

const props = defineProps<{ data: MetricSummary[] }>()
const maxViews = computed(() => Math.max(...props.data.map((d) => d.views)))
</script>

<template>
  <ul class="flex flex-col gap-4">
    <li v-for="row in data" :key="row.platform" class="flex items-center gap-3">
      <Icon :name="platformMeta[row.platform].icon" class="size-5 shrink-0" :style="{ color: platformMeta[row.platform].colorVar }" />
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-sm text-[var(--color-text)]">{{ platformMeta[row.platform].label }}</span>
          <span class="text-sm font-semibold text-[var(--color-text)]" style="font-variant-numeric: proportional-nums">
            {{ formatCompactNumber(row.views) }}
          </span>
        </div>
        <div class="mt-1.5 h-1.5 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
          <div
            class="h-full rounded-full transition-[width] duration-500"
            :style="{ width: `${(row.views / maxViews) * 100}%`, background: platformMeta[row.platform].colorVar }"
          />
        </div>
      </div>
    </li>
  </ul>
</template>

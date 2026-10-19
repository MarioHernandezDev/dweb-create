<script setup lang="ts">
import type { Influencer } from '~/types'

defineProps<{
  influencer: Influencer
  pendingCount: number
  overdueCount: number
}>()
</script>

<template>
  <NuxtLink :to="`/manager/influencers/${influencer.id}`" class="block">
    <BaseCard radius="md" padding="md" interactive class="flex items-center gap-4">
      <BaseAvatar :initials="influencer.initials" :hue="influencer.hue" />

      <div class="min-w-0 flex-1">
        <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ influencer.name }}</p>
        <p class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">{{ influencer.niche }}</p>
      </div>

      <div class="text-right shrink-0">
        <p class="text-[0.9375rem] font-semibold text-[var(--color-text)]" style="font-variant-numeric: proportional-nums">
          {{ pendingCount }}<span class="text-[var(--color-text-faint)] font-normal">/{{ influencer.weeklyTarget }}</span>
        </p>
        <p v-if="overdueCount" class="text-[0.75rem] font-medium text-[var(--color-status-alert)]">{{ overdueCount }} atrasadas</p>
        <p v-else class="text-[0.75rem] text-[var(--color-text-faint)]">al día</p>
      </div>

      <Icon name="ph:caret-right-bold" class="size-4 text-[var(--color-text-faint)] shrink-0" />
    </BaseCard>
  </NuxtLink>
</template>

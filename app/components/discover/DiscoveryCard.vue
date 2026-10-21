<script setup lang="ts">
import { coverArtFromString } from '~/utils/avatar'
import { formatCompactNumber, formatEuros } from '~/utils/mock-data'
import type { DiscoveryResult } from '~/composables/useDiscover'

const props = defineProps<{
  result: DiscoveryResult
  kind: 'creator' | 'partner'
  ctaLabel: string
}>()

defineEmits<{ contact: [] }>()

const coverArt = computed(() => coverArtFromString(props.result.id))
const icon = computed(() => (props.kind === 'creator' ? 'ph:user-focus' : 'ph:storefront-fill'))
const topCategories = computed(() => props.result.categories.slice(0, 3))
const extraCategoryCount = computed(() => Math.max(0, props.result.categories.length - 3))

const budgetLabel = computed(() => {
  const { minCents, maxCents } = props.result
  if (!minCents && !maxCents) return null
  return `${minCents ? formatEuros(minCents) : '…'}–${maxCents ? formatEuros(maxCents) : '…'}`
})
</script>

<template>
  <BaseCard radius="lg" padding="none" class="overflow-hidden flex flex-col">
    <div class="relative h-52">
      <img v-if="result.coverUrl" :src="result.coverUrl" alt="" class="absolute inset-0 size-full object-cover">
      <div
        v-else class="absolute inset-0 flex items-center justify-center"
        :style="{ background: `linear-gradient(${coverArt.angle}deg, ${coverArt.from}, ${coverArt.to})` }"
      >
        <Icon :name="icon" class="size-16 text-white/25" />
      </div>

      <div class="absolute inset-0" style="background: linear-gradient(185deg, rgb(10 9 12 / 5%) 35%, rgb(10 9 12 / 88%) 100%)" />

      <span
        v-if="result.reason" class="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.75rem] font-medium bg-black/45 backdrop-blur-sm text-white"
      >
        <Icon name="ph:sparkle-fill" class="size-3.5" /> {{ result.score }}% match
      </span>

      <div class="absolute inset-x-0 bottom-0 p-4">
        <p class="font-display text-white text-[1.25rem] leading-snug truncate">{{ result.name }}</p>
        <div v-if="topCategories.length" class="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span v-for="cat in topCategories" :key="cat" class="px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-white/15 text-white backdrop-blur-sm">
            {{ cat }}
          </span>
          <span v-if="extraCategoryCount" class="text-[0.6875rem] text-white/70">+{{ extraCategoryCount }}</span>
        </div>
      </div>
    </div>

    <div class="p-4 flex flex-col gap-3 flex-1">
      <p v-if="result.bio" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed line-clamp-2">{{ result.bio }}</p>
      <p v-else class="text-[0.8125rem] text-[var(--color-text-faint)] italic">Sin bio todavía.</p>

      <div class="flex items-center gap-3 text-[0.8125rem] text-[var(--color-text-muted)]">
        <span v-if="kind === 'creator'" class="inline-flex items-center gap-1.5">
          <Icon name="ph:users-three-fill" class="size-4 text-[var(--color-text-faint)]" /> {{ formatCompactNumber(result.followers) }}
        </span>
        <span v-if="budgetLabel" class="inline-flex items-center gap-1.5">
          <Icon name="ph:currency-eur" class="size-4 text-[var(--color-text-faint)]" /> {{ budgetLabel }}
        </span>
      </div>

      <p v-if="result.reason" class="text-[0.8125rem] text-[var(--color-primary-500)] flex items-start gap-1.5">
        <Icon name="ph:sparkle-fill" class="size-4 shrink-0 mt-0.5" /> {{ result.reason }}
      </p>

      <BaseButton variant="secondary" size="sm" class="w-full mt-auto" @click="$emit('contact')">{{ ctaLabel }}</BaseButton>
    </div>
  </BaseCard>
</template>

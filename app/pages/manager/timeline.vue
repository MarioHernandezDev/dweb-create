<script setup lang="ts">
import { influencers, influencerPosts } from '~/utils/mock-data'
import type { Influencer } from '~/types'

useHead({ title: 'Tablero' })

const influencersById = computed(() => Object.fromEntries(influencers.map((c) => [c.id, c])) as Record<string, Influencer>)

const activeInfluencer = ref<string>('all')

const filteredPosts = computed(() =>
  activeInfluencer.value === 'all' ? influencerPosts : influencerPosts.filter((p) => p.influencerId === activeInfluencer.value)
)
</script>

<template>
  <AppShell role="manager" title="Tablero" subtitle="Todas las entregas, de todo tu roster">
    <div class="flex gap-2 overflow-x-auto nx-scroll -mx-5 px-5 md:mx-0 md:px-0 pb-1 mb-7">
      <button
        type="button"
        class="shrink-0 h-9 px-4 rounded-full text-[0.8125rem] font-medium border transition-colors"
        :class="activeInfluencer === 'all'
          ? 'bg-[var(--color-primary-500)] text-[var(--color-on-primary)] border-[var(--color-primary-500)]'
          : 'border-[var(--color-hairline-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
        @click="activeInfluencer = 'all'"
      >
        Todos
      </button>
      <button
        v-for="influencer in influencers" :key="influencer.id" type="button"
        class="shrink-0 h-9 px-4 rounded-full text-[0.8125rem] font-medium border transition-colors"
        :class="activeInfluencer === influencer.id
          ? 'bg-[var(--color-primary-500)] text-[var(--color-on-primary)] border-[var(--color-primary-500)]'
          : 'border-[var(--color-hairline-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
        @click="activeInfluencer = influencer.id"
      >
        {{ influencer.name }}
      </button>
    </div>

    <WeekBoard :posts="filteredPosts" :influencers-by-id="activeInfluencer === 'all' ? influencersById : undefined" />
  </AppShell>
</template>

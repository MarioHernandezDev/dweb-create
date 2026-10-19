<script setup lang="ts">
import { influencers, influencerPosts, socialAccounts, platformMeta, formatCompactNumber } from '~/utils/mock-data'
import type { Post } from '~/types'

const route = useRoute()
const influencer = computed(() => influencers.find((c) => c.id === route.params.id))

if (!influencer.value) {
  throw createError({ statusCode: 404, statusMessage: 'Influencer no encontrado' })
}

useHead({ title: influencer.value.name })

const posts = computed(() => influencerPosts.filter((p) => p.influencerId === route.params.id))
const pending = computed(() => posts.value.filter((p) => p.status !== 'published').length)
const overdue = computed(() => posts.value.filter((p) => p.status === 'overdue').length)
const published = computed(() => posts.value.filter((p) => p.status === 'published').length)
const connectedAccounts = computed(() => socialAccounts.filter((a) => a.connected))

const detailOpen = ref(false)
const detailPost = ref<Post | null>(null)
function openDetail(post: Post) {
  detailPost.value = post
  detailOpen.value = true
}
</script>

<template>
  <AppShell v-if="influencer" role="manager" :title="influencer.name" :subtitle="influencer.niche">
    <section class="flex items-center gap-4 mb-7">
      <BaseAvatar :initials="influencer.initials" :hue="influencer.hue" size="lg" />
      <div>
        <p class="font-display text-[1.375rem] text-[var(--color-text)]">{{ influencer.name }}</p>
        <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ influencer.niche }} · {{ formatCompactNumber(influencer.followers) }} seguidores</p>
      </div>
    </section>

    <section class="grid grid-cols-3 gap-3 mb-8">
      <StatTile label="Por cerrar" :value="String(pending)" />
      <StatTile label="Fuera de plazo" :value="String(overdue)" />
      <StatTile label="Publicadas" :value="String(published)" />
    </section>

    <section class="mb-8">
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-3.5">Cuentas conectadas</h2>
      <div class="flex flex-wrap gap-2.5">
        <span
          v-for="acc in connectedAccounts" :key="acc.id"
          class="inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text-muted)]"
        >
          <Icon :name="platformMeta[acc.platform].icon" class="size-4" :style="{ color: platformMeta[acc.platform].colorVar }" />
          {{ acc.handle || platformMeta[acc.platform].label }}
        </span>
      </div>
    </section>

    <section>
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-3.5">Entregas</h2>
      <WeekBoard :posts="posts" @open="openDetail" />
    </section>
    <PostDetailSheet v-model="detailOpen" :post="detailPost" :influencer="influencer" />
  </AppShell>
</template>

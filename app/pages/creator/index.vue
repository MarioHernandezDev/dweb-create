<script setup lang="ts">
import { creatorPosts, engagementSeries } from '~/utils/mock-data'
import { coverPhotos } from '~/utils/images'

useHead({ title: 'Hoy' })
const cover = coverPhotos.creator

const composerOpen = ref(false)

const today = computed(() => creatorPosts.filter((p) => p.dueInDays === 0))
const upcoming = computed(() => creatorPosts.filter((p) => p.dueInDays > 0 && p.dueInDays <= 3))
const overdue = computed(() => creatorPosts.filter((p) => p.status === 'overdue'))
const streak = 6
</script>

<template>
  <AppShell role="creator" title="Hoy">
    <section class="relative rounded-[var(--radius-lg)] overflow-hidden mb-8 h-44 md:h-52">
      <CoverImage :photo="cover" :width="1200" :height="500" scrim="full" class="absolute inset-0" />
      <div class="relative h-full flex flex-col justify-end p-6 md:p-8">
        <p class="font-display text-[2.5rem] md:text-[2.75rem] leading-none text-white">
          {{ today.length + upcoming.length }} <span class="text-[1.125rem] font-sans font-normal text-white/70">publicaciones esta semana</span>
        </p>
        <p class="mt-2 inline-flex items-center gap-1.5 text-[0.9375rem] text-[var(--color-status-production)]">
          <Icon name="ph:fire-fill" class="size-4" />
          Racha de {{ streak }} días publicando
        </p>
      </div>
    </section>

    <section v-if="overdue.length" class="mb-7">
      <BaseCard radius="md" padding="md" class="flex items-center gap-3 border-[var(--color-status-alert)]/30 bg-[var(--color-status-alert)]/[0.06]">
        <Icon name="ph:warning-fill" class="size-5 text-[var(--color-status-alert)] shrink-0" />
        <p class="text-[0.875rem] text-[var(--color-text)]">
          Tienes {{ overdue.length }} publicación fuera de plazo. <NuxtLink to="/creator/timeline" class="font-medium underline underline-offset-2">Revisar</NuxtLink>
        </p>
      </BaseCard>
    </section>

    <section class="grid grid-cols-2 gap-3 mb-8">
      <StatTile label="Interacciones, 7 días" value="24.8K" :delta-pct="14.2" :trend="engagementSeries.map((p) => p.value)" />
      <StatTile label="Seguidores totales" value="170.5K" :delta-pct="4.1" :trend="engagementSeries.map((p) => p.value * 0.8)" />
    </section>

    <section>
      <div class="flex items-center justify-between mb-3.5">
        <h2 class="font-display text-[1.25rem] text-[var(--color-text)]">Próximas entregas</h2>
        <NuxtLink to="/creator/timeline" class="text-[0.875rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Ver todo</NuxtLink>
      </div>
      <WeekBoard :posts="[...today, ...upcoming]" />
    </section>

    <Fab @click="composerOpen = true" />
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>

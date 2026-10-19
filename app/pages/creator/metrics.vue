<script setup lang="ts">
import { metricsByPlatform, engagementSeries, formatCompactNumber } from '~/utils/mock-data'

useHead({ title: 'Métricas' })

const totalViews = computed(() => metricsByPlatform.reduce((sum, m) => sum + m.views, 0))
const totalEngagement = computed(() => metricsByPlatform.reduce((sum, m) => sum + m.likes + m.comments + m.shares, 0))
</script>

<template>
  <AppShell role="creator" title="Tus métricas" subtitle="Últimos 7 días, todas tus redes">
    <section class="grid grid-cols-2 gap-3 mb-6">
      <StatTile label="Alcance total" :value="formatCompactNumber(totalViews)" :delta-pct="11.3" :trend="engagementSeries.map((p) => p.value)" />
      <StatTile label="Interacciones" :value="formatCompactNumber(totalEngagement)" :delta-pct="18.6" :trend="engagementSeries.map((p) => p.value * 0.6)" />
    </section>

    <BaseCard radius="lg" padding="lg" class="mb-6">
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-1">Engagement de la semana</h2>
      <p class="text-[0.8125rem] text-[var(--color-text-muted)] mb-5">Puntuación compuesta: me gusta, comentarios y guardados</p>
      <WeeklyEngagementChart :data="engagementSeries" />
    </BaseCard>

    <BaseCard radius="lg" padding="lg">
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-5">Alcance por plataforma</h2>
      <PlatformBreakdown :data="metricsByPlatform" />
    </BaseCard>
  </AppShell>
</template>

<script setup lang="ts">
useHead({ title: 'Tendencias' })

const { trends, ensureLoaded } = useMyTrends()
await ensureLoaded()
</script>

<template>
  <AppShell role="creator" title="Tendencias" subtitle="Ideas de contenido generadas para tu nicho">
    <EmptyState
      v-if="!trends.length"
      icon="ph:flame" title="Sin ideas por ahora"
      description="Inténtalo de nuevo en unos minutos."
    />
    <div v-else class="grid gap-3 sm:grid-cols-2">
      <TrendCard v-for="trend in trends" :key="trend.id" :trend="trend" />
    </div>
  </AppShell>
</template>

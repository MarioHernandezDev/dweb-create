<script setup lang="ts">
import { trendSuggestions } from '~/utils/mock-data'

useHead({ title: 'Tendencias' })
</script>

<template>
  <AppShell role="creator" title="Tendencias" subtitle="Detectadas en las últimas 48 horas en tu nicho">
    <EmptyState
      v-if="!trendSuggestions.length"
      icon="ph:flame" title="Sin tendencias por ahora"
      description="En cuanto detectemos algo relevante en tu nicho, aparecerá aquí."
    />
    <div v-else class="grid gap-3 sm:grid-cols-2">
      <TrendCard v-for="trend in trendSuggestions" :key="trend.id" :trend="trend" />
    </div>
  </AppShell>
</template>

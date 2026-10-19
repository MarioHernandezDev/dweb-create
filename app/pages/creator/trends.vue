<script setup lang="ts">
import { trendSuggestions } from '~/utils/mock-data'

useHead({ title: 'Tendencias' })
</script>

<template>
  <AppShell role="creator" title="Tendencias" subtitle="Detectadas en las últimas 48 horas en tu nicho">
    <div class="grid gap-3 sm:grid-cols-2">
      <TrendCard v-for="trend in trendSuggestions" :key="trend.id" :trend="trend" />
    </div>
  </AppShell>
</template>

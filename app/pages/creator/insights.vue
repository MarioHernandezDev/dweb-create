<script setup lang="ts">
// Resultados dentro de CIBERAN (métricas propias). Las métricas de redes sociales viven aparte, en /creator/metrics.
useHead({ title: 'Resultados' })
const { range, metrics, loading, error, load, setRange } = useCollabInsights()
await load()
</script>

<template>
  <AppShell role="creator" title="Resultados" subtitle="Cómo van tus colaboraciones dentro de CIBERAN" full-width>
    <CollabInsights scope="creator" :metrics="metrics" :range="range" :loading="loading" :error="error" @update:range="setRange" @retry="load" />
  </AppShell>
</template>

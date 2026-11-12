<script setup lang="ts">
// Resultados dentro de CIBERAN (métricas propias). Las métricas de redes sociales son una funcionalidad futura (docs/17).
useHead({ title: 'Resultados' })
const { range, metrics, loading, error, load, setRange } = useCollabInsights()
await load()
</script>

<template>
  <AppShell role="partner" title="Resultados" subtitle="Cómo van tus colaboraciones dentro de CIBERAN" full-width>
    <CollabInsights scope="partner" :metrics="metrics" :range="range" :loading="loading" :error="error" @update:range="setRange" @retry="load" />
  </AppShell>
</template>

<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} · CIBERAN` : 'CIBERAN — Estudio de contenido')
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--color-primary-500)" :height="3" />
  <LoadingOverlay />
  <NuxtPage :transition="{ name: 'page', mode: 'default' }" />
</template>

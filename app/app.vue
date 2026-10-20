<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} · FEEDMA` : 'FEEDMA — Estudio de contenido')
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--color-primary-500)" :height="3" />
  <LoadingOverlay />
  <NuxtPage :transition="{ name: 'page', mode: 'default' }" />
</template>

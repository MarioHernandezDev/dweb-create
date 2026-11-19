<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} · CIBERAN` : 'CIBERAN — Creadores y marcas')
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--color-cobalto-600)" :height="3" />
  <LoadingOverlay />
  <NuxtPage :transition="{ name: 'page', mode: 'default' }" />
</template>

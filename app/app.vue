<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} · FEEDMA` : 'FEEDMA — Estudio de contenido')
})
</script>

<template>
  <NuxtPage :transition="{ name: 'page', mode: 'default' }" />
</template>

<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} · dweb-create` : 'dweb-create — Estudio de contenido')
})
</script>

<template>
  <NuxtPage :transition="{ name: 'page', mode: 'default' }" />
</template>

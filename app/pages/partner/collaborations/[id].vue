<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id))
</script>

<template>
  <AppShell role="partner" title="Colaboración">
    <CollabWorkspace :key="id" role="partner" :id="id" />
  </AppShell>
</template>

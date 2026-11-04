<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id))
</script>

<template>
  <AppShell role="creator" title="Colaboración">
    <CollabWorkspace :key="id" role="creator" :id="id" />
  </AppShell>
</template>

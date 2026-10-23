<script setup lang="ts">
useHead({ title: 'Tablero' })
const { ensureLoaded } = useMyPosts()
const composerOpen = ref(false)

await ensureLoaded()
</script>

<template>
  <AppShell role="creator" title="Tu tablero" subtitle="Arrastra una card para cambiarla de fase" full-width>
    <PhaseBoard />
    <Fab :active="composerOpen" @click="composerOpen = true" />
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>

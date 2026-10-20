<script setup lang="ts">
useHead({ title: 'Tablero' })
const router = useRouter()
const { ensureLoaded } = useMyPosts()
const composerOpen = ref(false)

await ensureLoaded()
</script>

<template>
  <AppShell role="creator" title="Tu tablero" subtitle="Arrastra una card para cambiarla de fase" full-width>
    <PhaseBoard @open="router.push(`/creator/post/${$event.id}`)" />
    <Fab :active="composerOpen" @click="composerOpen = true" />
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>

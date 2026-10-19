<script setup lang="ts">
import { creatorPosts } from '~/utils/mock-data'

useHead({ title: 'Tablero' })
const composerOpen = ref(false)
</script>

<template>
  <AppShell role="creator" title="Tu tablero" subtitle="Todo tu contenido, de idea a publicado">
    <WeekBoard :posts="creatorPosts" />
    <Fab @click="composerOpen = true" />
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>

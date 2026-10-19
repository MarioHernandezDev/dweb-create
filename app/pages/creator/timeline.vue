<script setup lang="ts">
useHead({ title: 'Tablero' })
const router = useRouter()
const creatorPosts = useCreatorPosts()
const composerOpen = ref(false)
</script>

<template>
  <AppShell role="creator" title="Tu tablero" subtitle="Todo tu contenido, de idea a publicado">
    <WeekBoard :posts="creatorPosts" @open="router.push(`/creator/post/${$event.id}`)" />
    <Fab :active="composerOpen" @click="composerOpen = true" />
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>

<script setup lang="ts">
useHead({ title: 'Colaboraciones' })

// Cada colaboración tiene su propia página (`/creator/collaborations/[id]`). Los
// enlaces antiguos (avisos, chat) siguen apuntando a `?collaboration=<id>` y se
// reenvían allí conservando el resto de parámetros (`post`…).
const route = useRoute()
const target = route.query.collaboration
if (typeof target === 'string') {
  const { collaboration: _omit, ...rest } = route.query
  await navigateTo({ path: `/creator/collaborations/${target}`, query: rest }, { replace: true })
}
</script>

<template>
  <AppShell role="creator" title="Colaboraciones" subtitle="Sigue cada colaboración desde que se acepta hasta que cobras" full-width>
    <CollabHub role="creator" />
  </AppShell>
</template>

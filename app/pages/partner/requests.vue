<script setup lang="ts">
useHead({ title: 'Colaboraciones' })

// Cada colaboración tiene su propia página (`/partner/collaborations/[id]`). Los
// enlaces antiguos —avisos, chat y el regreso de Stripe, que siguen apuntando a
// `?collaboration=<id>`— se reenvían allí conservando el resto de parámetros
// (`post`, `payment`…).
const route = useRoute()
const target = route.query.collaboration
if (typeof target === 'string') {
  const { collaboration: _omit, ...rest } = route.query
  await navigateTo({ path: `/partner/collaborations/${target}`, query: rest }, { replace: true })
}
</script>

<template>
  <AppShell role="partner" title="Colaboraciones" subtitle="Sigue cada colaboración desde que se acepta hasta que se publica" full-width>
    <CollabHub role="partner" />
  </AppShell>
</template>

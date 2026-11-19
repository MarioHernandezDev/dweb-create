<script setup lang="ts">
// Paquetes propios: lo que permite que te hagan ofertas. Entrada de primer nivel del menú; la misma gestión que la pestaña del perfil.
useHead({ title: 'Paquetes' })
const { resolveMyProfileId } = useMyProfileId()
const { ensureMyPackages } = usePackages()
const { refreshPendingCounts } = useOffers()
const { creator: me, ensureCreator: ensureMe } = useMyCreator()

const myProfileId = await resolveMyProfileId()
await Promise.all([
  ensureMe(),
  myProfileId ? ensureMyPackages(myProfileId) : Promise.resolve([]),
  myProfileId ? refreshPendingCounts(myProfileId) : Promise.resolve()
])
</script>

<template>
  <AppShell role="creator" title="Paquetes">
    <PackagesManager role="creator" :profile-id="myProfileId" :public-href="me ? `/profile/creator/${me.id}?seccion=packages` : null" />
  </AppShell>
</template>

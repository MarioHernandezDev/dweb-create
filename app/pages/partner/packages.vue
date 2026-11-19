<script setup lang="ts">
// Necesidades propias (los «paquetes» del partner). Entrada de primer nivel del menú; la misma gestión que la pestaña del perfil.
useHead({ title: 'Necesidades' })
const { resolveMyProfileId } = useMyProfileId()
const { ensureMyPackages } = usePackages()
const { refreshPendingCounts } = useOffers()
const { partner: me, ensurePartner: ensureMe } = useMyPartner()

const myProfileId = await resolveMyProfileId()
await Promise.all([
  ensureMe(),
  myProfileId ? ensureMyPackages(myProfileId) : Promise.resolve([]),
  myProfileId ? refreshPendingCounts(myProfileId) : Promise.resolve()
])
</script>

<template>
  <AppShell role="partner" title="Necesidades">
    <PackagesManager role="partner" :profile-id="myProfileId" :public-href="me ? `/profile/partner/${me.id}?seccion=packages` : null" />
  </AppShell>
</template>

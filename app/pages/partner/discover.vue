<script setup lang="ts">
import type { DiscoveryResult } from '~/composables/useDiscover'

useHead({ title: 'Descubrir' })

// Hallazgo #7: "Contactar" avisa de una solicitud ya enviada a ese mismo creador.
const { collaborations: myCollaborations, ensureLoaded: ensureCollaborationsLoaded, refresh: refreshCollaborations } = useMyCollaborations()
const pendingCreatorIds = computed(() => myCollaborations.value.filter((c) => c.status === 'requested').map((c) => c.creatorId))
// Solo sirven para marcar «solicitud ya enviada» en «Contactar»: no bloquean el primer pintado.
onMounted(() => { ensureCollaborationsLoaded() })

const sheetOpen = ref(false)
const target = ref<DiscoveryResult | null>(null)
function openContact(creator: DiscoveryResult) {
  target.value = creator
  sheetOpen.value = true
}
</script>

<template>
  <AppShell role="partner" title="Descubrir" subtitle="Contacta directo con un creador de contenido" full-width>
    <DiscoverBrowser kind="creator" cta-label="Contactar" :pending-ids="pendingCreatorIds" @contact="openContact" />

    <InviteDialog v-model="sheetOpen" :target="target" @sent="refreshCollaborations" />
  </AppShell>
</template>

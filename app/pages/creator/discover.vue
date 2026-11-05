<script setup lang="ts">
import type { DiscoveryResult } from '~/composables/useDiscover'

useHead({ title: 'Descubrir' })

// Hallazgo #7: "Proponer" avisa de una solicitud ya enviada a ese mismo partner.
const { requests: myRequests, ensureLoaded: ensureRequestsLoaded, refresh: refreshRequests } = useCollabRequests()
const pendingPartnerIds = computed(() => myRequests.value.filter((r) => r.status === 'requested').map((r) => r.partnerId))
// Solo sirven para marcar «solicitud ya enviada» en «Contactar»: no bloquean el primer pintado.
onMounted(() => { ensureRequestsLoaded() })

const proposalOpen = ref(false)
const target = ref<DiscoveryResult | null>(null)

function openContact(partnerResult: DiscoveryResult) {
  target.value = partnerResult
  proposalOpen.value = true
}
</script>

<template>
  <AppShell role="creator" title="Descubrir" subtitle="Encuentra marcas interesadas en tu contenido" full-width>
    <DiscoverBrowser kind="partner" cta-label="Proponer" :pending-ids="pendingPartnerIds" @contact="openContact" />
    <ProposalDialog v-model="proposalOpen" :target="target" @sent="refreshRequests" />
  </AppShell>
</template>

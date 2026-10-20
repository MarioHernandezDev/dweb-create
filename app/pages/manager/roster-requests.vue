<script setup lang="ts">
import { rosterRequestStatusMeta } from '~/utils/status'

useHead({ title: 'Solicitudes de plantilla' })

const { requests, acting, ensureLoaded, accept, decline } = useRosterRequests()
await ensureLoaded()

const sorted = computed(() => {
  const order: Record<string, number> = { requested: 0, accepted: 1, declined: 2 }
  return [...requests.value].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
})
</script>

<template>
  <AppShell role="manager" title="Solicitudes de plantilla" subtitle="Influencers que piden unirse a tu agencia">
    <EmptyState
      v-if="!sorted.length"
      icon="ph:users-three" title="Sin solicitudes todavía"
      description="Cuando un influencer pida unirse a tu agencia desde 'Descubrir', aparecerá aquí."
    />
    <div v-else class="flex flex-col gap-2.5 md:max-w-xl">
      <BaseCard v-for="req in sorted" :key="req.id" radius="lg" padding="md">
        <div class="flex items-center justify-between gap-3 mb-1">
          <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ req.influencerName }}</p>
        </div>
        <p class="text-[0.75rem] mb-3" :style="{ color: rosterRequestStatusMeta[req.status].color }">
          {{ rosterRequestStatusMeta[req.status].label }}
        </p>

        <div v-if="req.status === 'requested'" class="flex gap-2.5">
          <BaseButton
            variant="secondary" size="sm" class="flex-1" :disabled="acting === req.id"
            @click="decline(req.id)"
          >
            Rechazar
          </BaseButton>
          <BaseButton
            variant="primary" size="sm" class="flex-1" :icon-spin="acting === req.id" :disabled="acting === req.id"
            @click="accept(req.id)"
          >
            Aceptar
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </AppShell>
</template>

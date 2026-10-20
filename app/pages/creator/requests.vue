<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { collaborationStatusMeta } from '~/utils/status'

useHead({ title: 'Solicitudes' })

const { requests, acting, ensureLoaded, acceptAsInfluencer, decline } = useCollabRequests()
await ensureLoaded()

const sorted = computed(() => {
  // Las pendientes primero — son las que de verdad hay que mirar.
  const order: Record<string, number> = { requested: 0, accepted: 1, in_progress: 1, completed: 2, declined: 3 }
  return [...requests.value].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
})
</script>

<template>
  <AppShell role="creator" title="Solicitudes" subtitle="Colaboraciones que te han propuesto marcas directamente">
    <EmptyState
      v-if="!sorted.length"
      icon="ph:handshake" title="Sin solicitudes todavía"
      description="Cuando una marca te contacte desde 'Descubrir', aparecerá aquí."
    />
    <div v-else class="flex flex-col gap-2.5 md:max-w-xl">
      <BaseCard v-for="req in sorted" :key="req.id" radius="lg" padding="md">
        <div class="flex items-center justify-between gap-3 mb-1">
          <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ req.brandName }}</p>
          <span class="text-[0.9375rem] font-medium text-[var(--color-text)] shrink-0">{{ formatEuros(req.budgetCents) }}</span>
        </div>
        <p class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mb-3">{{ req.brief }}</p>
        <p class="text-[0.75rem] mb-3" :style="{ color: collaborationStatusMeta[req.status].color }">
          {{ collaborationStatusMeta[req.status].label }}
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
            @click="acceptAsInfluencer(req.id)"
          >
            Aceptar
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </AppShell>
</template>

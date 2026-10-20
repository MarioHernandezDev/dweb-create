<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import { collaborationStatusMeta } from '~/utils/status'

// "Pagar" solo tiene sentido una vez la otra parte ha aceptado — antes de
// eso ni siquiera sabe que existe la solicitud (ver useCollabRequests.ts).
const payableStatuses = ['accepted', 'in_progress', 'completed']

useHead({ title: 'Perfil' })

const route = useRoute()
const { brandClient } = useMyBrandClient()
const { collaborations, paying, ensureLoaded, refresh: refreshCollaborations, payForCollaboration } = useMyCollaborations()

if (route.query.payment) await refreshCollaborations()
else await ensureLoaded()

const user = useSupabaseUser()
const { logout } = useLogout()
</script>

<template>
  <AppShell role="client" title="Perfil">
    <div class="md:max-w-lg">
      <section class="flex items-center gap-4 mb-8">
        <BaseAvatar v-if="brandClient" :initials="initialsFromName(brandClient.name)" :hue="hueFromString(brandClient.name)" size="lg" />
        <div>
          <p class="font-display text-[1.25rem] text-[var(--color-text)]">{{ brandClient?.name }}</p>
          <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ user?.email ?? 'Cuenta de marca' }}</p>
        </div>
      </section>

      <BaseCard v-if="route.query.payment" radius="md" padding="md" class="flex items-center gap-3 mb-6">
        <Icon
          :name="route.query.payment === 'success' ? 'ph:check-circle-fill' : 'ph:info-fill'" class="size-5 shrink-0"
          :class="route.query.payment === 'success' ? 'text-[var(--color-status-published)]' : 'text-[var(--color-text-muted)]'"
        />
        <p class="text-[0.875rem] text-[var(--color-text)]">
          {{ route.query.payment === 'success' ? 'Pago enviado.' : 'Pago cancelado, no se ha cobrado nada.' }}
        </p>
      </BaseCard>

      <section class="mb-6">
        <div class="flex items-center justify-between mb-2 px-1">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)]">Tus colaboraciones</p>
          <NuxtLink to="/client/discover" class="text-[0.8125rem] font-medium text-[var(--color-primary-500)]">Descubrir más</NuxtLink>
        </div>

        <EmptyState
          v-if="!collaborations.length"
          icon="ph:handshake" title="Ninguna todavía"
          description="Contacta a un influencer o a una agencia desde 'Descubrir' para empezar."
        />
        <div v-else class="flex flex-col gap-2.5">
          <BaseCard v-for="collab in collaborations" :key="collab.id" radius="lg" padding="md">
            <div class="flex items-center justify-between gap-3 mb-1">
              <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">
                {{ collab.influencerName ?? collab.managerName ?? 'Sin asignar' }}
              </p>
              <span class="text-[0.9375rem] font-medium text-[var(--color-text)] shrink-0">{{ formatEuros(collab.budgetCents) }}</span>
            </div>
            <p v-if="collab.influencerName && collab.managerName" class="text-[0.75rem] text-[var(--color-text-faint)] mb-3">
              Representado por {{ collab.managerName }}
            </p>
            <p v-else class="text-[0.75rem] mb-3" :style="{ color: collaborationStatusMeta[collab.status].color }">
              {{ collaborationStatusMeta[collab.status].label }}
            </p>

            <p v-if="collab.paidAt" class="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-status-published)]">
              <Icon name="ph:check-circle-fill" class="size-4" /> Pagado
            </p>
            <p v-else-if="!payableStatuses.includes(collab.status)" class="text-[0.75rem] text-[var(--color-text-faint)]">
              Se podrá pagar cuando acepten la solicitud.
            </p>
            <BaseButton
              v-else variant="primary" size="sm" class="w-full" :disabled="!collab.budgetCents || paying === collab.id"
              :icon-spin="paying === collab.id" @click="payForCollaboration(collab.id)"
            >
              {{ paying === collab.id ? 'Abriendo pago…' : 'Pagar' }}
            </BaseButton>
          </BaseCard>
        </div>
      </section>

      <BaseButton variant="secondary" icon="ph:sign-out-bold" class="w-full" @click="logout">Cerrar sesión</BaseButton>
    </div>
  </AppShell>
</template>

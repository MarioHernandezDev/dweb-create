<script setup lang="ts">
import { clients, agencyPosts } from '~/utils/mock-data'

useHead({ title: 'Resumen' })

const postsByClient = computed(() => {
  const map = new Map<string, typeof agencyPosts>()
  for (const client of clients) map.set(client.id, agencyPosts.filter((p) => p.clientId === client.id))
  return map
})

const totalOverdue = computed(() => agencyPosts.filter((p) => p.status === 'overdue').length)
const totalPublishedWeek = computed(() => agencyPosts.filter((p) => p.status === 'published').length)

const sortedClients = computed(() =>
  [...clients].sort((a, b) => {
    const overdueA = postsByClient.value.get(a.id)!.filter((p) => p.status === 'overdue').length
    const overdueB = postsByClient.value.get(b.id)!.filter((p) => p.status === 'overdue').length
    return overdueB - overdueA
  })
)

function pendingCount(clientId: string) {
  return postsByClient.value.get(clientId)!.filter((p) => p.status !== 'published').length
}
function overdueCount(clientId: string) {
  return postsByClient.value.get(clientId)!.filter((p) => p.status === 'overdue').length
}

const goalPct = computed(() => Math.min(100, Math.round((totalPublishedWeek.value / agencyPosts.length) * 100)))
const priorityClient = computed(() => sortedClients.value[0])

const quickActions = computed(() => [
  { label: 'Tablero', icon: 'ph:kanban-fill', to: '/manager/timeline' },
  { label: 'Métricas', icon: 'ph:chart-line-up-fill', to: '/manager/metrics' },
  { label: 'Clientes', icon: 'ph:users-three-fill', to: priorityClient.value ? `/manager/clients/${priorityClient.value.id}` : undefined },
  { label: 'Perfil', icon: 'ph:user-circle-fill', to: '/manager/profile' }
])
</script>

<template>
  <AppShell role="manager" title="Resumen" subtitle="Lunes a domingo, esta semana">
    <section class="mb-6">
      <h1 class="font-display text-[2rem] md:text-[2.5rem] leading-[1.08] text-[var(--color-text)]">Mantén el ritmo esta semana</h1>
      <p class="mt-1.5 inline-flex items-center gap-1.5 text-[0.9375rem] text-[var(--color-status-published)]">
        <Icon name="ph:check-circle-fill" class="size-4" />
        {{ totalPublishedWeek }} entregas publicadas esta semana
      </p>
    </section>

    <section class="mb-6">
      <BaseCard radius="lg" padding="lg" class="flex items-center gap-4 md:max-w-md">
        <div class="min-w-0 flex-1">
          <p class="text-[0.9375rem] text-[var(--color-text)] leading-snug">
            Estás al <strong class="font-semibold">{{ goalPct }}%</strong> de las entregas cerradas
          </p>
          <div class="mt-3 flex items-center gap-3">
            <div class="flex-1 h-2 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
              <div
                class="h-full rounded-full bg-[var(--color-primary-500)] transition-[width] duration-700 ease-[var(--ease-spring)]"
                :style="{ width: `${goalPct}%` }"
              />
            </div>
            <span class="shrink-0 text-[0.8125rem] text-[var(--color-text-faint)]" style="font-variant-numeric: proportional-nums">
              {{ totalPublishedWeek }}/{{ agencyPosts.length }}
            </span>
          </div>
        </div>
        <NuxtLink
          to="/manager/timeline" aria-label="Ver tablero completo"
          class="shrink-0 size-14 rounded-full bg-[var(--color-primary-500)] text-[var(--color-on-primary)] shadow-[0_10px_22px_-8px_var(--color-primary-500)] hover:shadow-[0_14px_28px_-6px_var(--color-primary-500)] flex items-center justify-center active:scale-90 transition-[transform,box-shadow] duration-300 ease-[var(--ease-spring-out)]"
        >
          <Icon name="ph:kanban-fill" class="size-6" />
        </NuxtLink>
      </BaseCard>
    </section>

    <section class="mb-8">
      <div class="flex justify-between md:justify-start md:gap-8">
        <NuxtLink
          v-for="action in quickActions" :key="action.label" :to="action.to"
          class="flex flex-col items-center gap-1.5 flex-1 md:flex-none md:w-16"
          :class="!action.to && 'pointer-events-none opacity-40'"
        >
          <span class="flex items-center justify-center size-14 rounded-full bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[var(--color-text)] transition-[transform,border-color] duration-200 ease-[var(--ease-spring)] active:scale-95 hover:border-[var(--color-hairline-strong)]">
            <Icon :name="action.icon" class="size-5" />
          </span>
          <span class="text-[0.75rem] text-[var(--color-text-muted)] text-center">{{ action.label }}</span>
        </NuxtLink>
      </div>
    </section>

    <section class="mb-9">
      <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-3.5">Resumen de la semana</h2>
      <div class="grid grid-cols-3 gap-3">
        <div class="nx-stagger-in" style="--stagger-i: 0"><StatTile label="Clientes activos" :value="String(clients.length)" /></div>
        <div class="nx-stagger-in" style="--stagger-i: 1"><StatTile label="Fuera de plazo" :value="String(totalOverdue)" /></div>
        <div class="nx-stagger-in" style="--stagger-i: 2"><StatTile label="Publicadas" :value="String(totalPublishedWeek)" /></div>
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-3.5">
        <h2 class="font-display text-[1.25rem] text-[var(--color-text)]">Tus clientes</h2>
        <NuxtLink to="/manager/timeline" class="text-[0.875rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          Ver tablero completo
        </NuxtLink>
      </div>
      <div class="flex flex-col gap-2.5">
        <div
          v-for="(client, i) in sortedClients" :key="client.id"
          class="nx-stagger-in" :style="{ '--stagger-i': i }"
        >
          <ClientRow
            :client="client"
            :pending-count="pendingCount(client.id)" :overdue-count="overdueCount(client.id)"
          />
        </div>
      </div>
    </section>
  </AppShell>
</template>

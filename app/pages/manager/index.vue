<script setup lang="ts">
import { clients, agencyPosts } from '~/utils/mock-data'
import { coverPhotos } from '~/utils/images'

useHead({ title: 'Resumen' })
const cover = coverPhotos.manager

const postsByClient = computed(() => {
  const map = new Map<string, typeof agencyPosts>()
  for (const client of clients) map.set(client.id, agencyPosts.filter((p) => p.clientId === client.id))
  return map
})

const totalPending = computed(() => agencyPosts.filter((p) => p.status !== 'published').length)
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
</script>

<template>
  <AppShell role="manager" title="Resumen" subtitle="Lunes a domingo, esta semana">
    <section class="relative rounded-[var(--radius-lg)] overflow-hidden mb-9 h-44 md:h-52">
      <CoverImage :photo="cover" :width="1200" :height="500" scrim="full" class="absolute inset-0" />
      <div class="relative h-full flex flex-col justify-end p-6 md:p-8">
        <p class="font-display text-[2.5rem] md:text-[2.75rem] leading-none text-white">
          {{ totalPending }} <span class="text-[1.125rem] font-sans font-normal text-white/70">entregas por cerrar</span>
        </p>
        <p class="mt-2 text-[0.9375rem] text-white/70">
          Repartidas entre {{ clients.length }} clientes activos esta semana.
        </p>
      </div>
    </section>

    <section class="grid grid-cols-3 gap-3 mb-9">
      <div class="nx-stagger-in" style="--stagger-i: 0"><StatTile label="Clientes activos" :value="String(clients.length)" /></div>
      <div class="nx-stagger-in" style="--stagger-i: 1"><StatTile label="Fuera de plazo" :value="String(totalOverdue)" /></div>
      <div class="nx-stagger-in" style="--stagger-i: 2"><StatTile label="Publicadas" :value="String(totalPublishedWeek)" /></div>
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

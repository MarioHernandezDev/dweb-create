<script setup lang="ts">
import { clients, agencyPosts } from '~/utils/mock-data'
import type { ClientAccount } from '~/types'

useHead({ title: 'Tablero' })

const clientsById = computed(() => Object.fromEntries(clients.map((c) => [c.id, c])) as Record<string, ClientAccount>)

const activeClient = ref<string>('all')

const filteredPosts = computed(() =>
  activeClient.value === 'all' ? agencyPosts : agencyPosts.filter((p) => p.clientId === activeClient.value)
)
</script>

<template>
  <AppShell role="manager" title="Tablero" subtitle="Todas las entregas, de todos los clientes">
    <div class="flex gap-2 overflow-x-auto nx-scroll -mx-5 px-5 md:mx-0 md:px-0 pb-1 mb-7">
      <button
        type="button"
        class="shrink-0 h-9 px-4 rounded-full text-[0.8125rem] font-medium border transition-colors"
        :class="activeClient === 'all'
          ? 'bg-[var(--color-flame-500)] text-[var(--color-on-flame)] border-[var(--color-flame-500)]'
          : 'border-[var(--color-hairline-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
        @click="activeClient = 'all'"
      >
        Todos
      </button>
      <button
        v-for="client in clients" :key="client.id" type="button"
        class="shrink-0 h-9 px-4 rounded-full text-[0.8125rem] font-medium border transition-colors"
        :class="activeClient === client.id
          ? 'bg-[var(--color-flame-500)] text-[var(--color-on-flame)] border-[var(--color-flame-500)]'
          : 'border-[var(--color-hairline-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
        @click="activeClient = client.id"
      >
        {{ client.name }}
      </button>
    </div>

    <WeekBoard :posts="filteredPosts" :clients-by-id="activeClient === 'all' ? clientsById : undefined" />
  </AppShell>
</template>

<script setup lang="ts">
import { clients, agencyPosts, socialAccounts } from '~/utils/mock-data'

const route = useRoute()
const client = computed(() => clients.find((c) => c.id === route.params.id))

if (!client.value) {
  throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
}

useHead({ title: client.value.name })

const posts = computed(() => agencyPosts.filter((p) => p.clientId === route.params.id))
const pending = computed(() => posts.value.filter((p) => p.status !== 'published').length)
const overdue = computed(() => posts.value.filter((p) => p.status === 'overdue').length)
const published = computed(() => posts.value.filter((p) => p.status === 'published').length)
const connectedAccounts = computed(() => socialAccounts.filter((a) => a.connected))
</script>

<template>
  <AppShell v-if="client" role="manager" :title="client.name" :subtitle="client.industry">
    <section class="flex items-center gap-4 mb-7">
      <BaseAvatar :initials="client.initials" :hue="client.hue" size="lg" />
      <div>
        <p class="font-display text-[1.375rem] text-[var(--color-text)]">{{ client.name }}</p>
        <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ client.industry }}</p>
      </div>
    </section>

    <section class="grid grid-cols-3 gap-3 mb-8">
      <StatTile label="Por cerrar" :value="String(pending)" />
      <StatTile label="Fuera de plazo" :value="String(overdue)" />
      <StatTile label="Publicadas" :value="String(published)" />
    </section>

    <section class="mb-8">
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-3.5">Cuentas conectadas</h2>
      <div class="flex flex-wrap gap-2.5">
        <span
          v-for="acc in connectedAccounts" :key="acc.id"
          class="inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text-muted)]"
        >
          <Icon :name="acc.platform === 'instagram' ? 'ph:instagram-logo-fill' : acc.platform === 'tiktok' ? 'ph:tiktok-logo-fill' : acc.platform === 'youtube' ? 'ph:youtube-logo-fill' : 'ph:x-logo-fill'" class="size-4" />
          {{ acc.handle }}
        </span>
      </div>
    </section>

    <section>
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-3.5">Entregas</h2>
      <WeekBoard :posts="posts" />
    </section>
  </AppShell>
</template>

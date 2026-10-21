<script setup lang="ts">
import { formatCompactNumber } from '~/utils/mock-data'

useHead({ title: 'Métricas' })

// Datos reales de `social_accounts` (ver useMySocialAccounts.ts) — nada de
// mock-data.ts aquí. Alcance/interacciones reales dependen del permiso de
// insights de Instagram, todavía no aprobado por Meta (ver
// docs/9-INSTAGRAM-OAUTH-SETUP.md §5), así que de momento solo hay
// seguidores que mostrar de verdad.
const { accounts, ensureLoaded } = useMySocialAccounts()
await ensureLoaded()

const connected = computed(() => accounts.value.filter((a) => a.connected))
const totalFollowers = computed(() => connected.value.reduce((sum, a) => sum + a.followers, 0))
const breakdown = computed(() =>
  connected.value.map((a) => ({ platform: a.platform, views: a.followers, likes: 0, comments: 0, shares: 0, deltaPct: 0 }))
)
</script>

<template>
  <AppShell role="creator" title="Tus métricas" subtitle="Datos reales de tus redes conectadas">
    <EmptyState
      v-if="!connected.length"
      icon="ph:chart-line-up" title="Conecta una red para ver tus métricas"
      description="Ve a Redes y conecta Instagram para empezar a ver datos reales aquí."
    >
      <BaseButton variant="primary" to="/creator/socials">Ir a Redes</BaseButton>
    </EmptyState>

    <template v-else>
      <section class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 md:max-w-md">
        <StatTile label="Seguidores totales" :value="formatCompactNumber(totalFollowers)" />
      </section>

      <BaseCard radius="lg" padding="lg" class="mb-6 md:max-w-xl">
        <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-5">Seguidores por red</h2>
        <PlatformBreakdown :data="breakdown" />
      </BaseCard>

      <BaseCard radius="lg" padding="lg" class="md:max-w-xl flex items-start gap-3">
        <Icon name="ph:info-fill" class="size-5 shrink-0 text-[var(--color-text-faint)] mt-0.5" />
        <p class="text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed">
          Alcance, interacciones y la evolución semana a semana todavía no están conectados de verdad — hace falta el permiso de
          insights de Instagram, pendiente de verificación de Meta. Por ahora solo ves seguidores reales.
        </p>
      </BaseCard>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { formatCompactNumber, VERIFIED_SOCIAL_PLATFORMS, socialAccountState, platformMeta } from '~/utils/mock-data'
import type { SocialAccount } from '~/types'

useHead({ title: 'Métricas' })

// Datos reales de `social_accounts` (ver useMySocialAccounts.ts) — nada de
// mock-data.ts más allá del formateo y la paleta. Alcance/interacciones por
// publicación todavía no están conectados para ninguna red (ver el aviso al
// fondo), así que de momento solo hay seguidores/suscriptores reales:
// Instagram y YouTube son las únicas con OAuth real detrás
// (VERIFIED_SOCIAL_PLATFORMS) — el resto aparece como "Próximamente" y no
// entra en los totales.
const { accounts, ensureLoaded } = useMySocialAccounts()
await ensureLoaded()
// Conectar, desconectar y sincronizar viven aquí desde que se eliminó la página Redes.
const {
  connect, connectResult, busyPlatform, syncingPlatform, syncError, syncReconnect, disconnectNotice, rowAlreadyShowsReconnect,
  toggle, syncAccount
} = useSocialAccountActions()
const connectedCount = computed(() => accounts.value.filter((a) => a.connected).length)

const verifiedConnected = computed(() => accounts.value.filter((a) => a.connected && VERIFIED_SOCIAL_PLATFORMS.includes(a.platform)))
const totalFollowers = computed(() => verifiedConnected.value.reduce((sum, a) => sum + a.followers, 0))

function shareFor(acc: SocialAccount) {
  return totalFollowers.value > 0 ? (acc.followers / totalFollowers.value) * 100 : 0
}
</script>

<template>
  <AppShell role="creator" title="Tus métricas" subtitle="Datos reales de tus redes conectadas">
    <!-- Avisos de la última acción sobre una red (vuelta del OAuth, desconexión, sincronización) -->
    <div class="flex flex-col gap-2 mb-5 md:max-w-xl" aria-live="polite">
      <p v-if="connectResult?.ok" class="text-[0.8125rem] text-[var(--color-status-published)]">
        Cuenta de {{ platformMeta[connectResult.platform].label }} conectada.
      </p>
      <p v-else-if="connectResult && !connectResult.ok" class="text-[0.8125rem] text-[var(--color-status-alert)]">{{ connectResult.reason }}</p>
      <p
        v-if="disconnectNotice" class="text-[0.8125rem]"
        :class="disconnectNotice.tone === 'ok' ? 'text-[var(--color-status-published)]' : disconnectNotice.tone === 'warn' ? 'text-[var(--color-text)]' : 'text-[var(--color-status-alert)]'"
      >
        {{ disconnectNotice.text }}
      </p>
      <div v-if="syncError && !rowAlreadyShowsReconnect" class="flex flex-wrap items-center gap-3">
        <p class="text-[0.8125rem] text-[var(--color-status-alert)]">{{ syncError }}</p>
        <BaseButton v-if="syncReconnect" variant="primary" size="sm" @click="connect(syncReconnect)">Reconectar</BaseButton>
      </div>
    </div>

    <template v-if="!verifiedConnected.length">
      <EmptyState
        icon="ph:chart-line-up" title="Conecta una red para ver tus métricas"
        description="Conecta Instagram o YouTube aquí abajo para empezar a ver datos reales."
      />

      <!-- Hallazgo #12: la pantalla vacía no daba ninguna pista de qué
           aspecto tendría esto con datos reales — un ejemplo con números
           falsos, claramente marcado como tal y sin interacción, da ese
           contexto sin mentir sobre tener datos ya. -->
      <section class="mt-10 opacity-50 pointer-events-none select-none" aria-hidden="true">
        <p class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Así se vería con una red conectada (ejemplo)</p>
        <div class="grid grid-cols-2 gap-3 mb-5 md:max-w-sm">
          <StatTile label="Seguidores totales" value="12,4 mil" />
          <StatTile label="Redes verificadas" value="1 de 2" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:max-w-3xl">
          <PlatformStatCard platform="instagram" state="connected" :followers="12400" :share-pct="100" />
        </div>
      </section>
    </template>

    <template v-else>
      <section class="grid grid-cols-2 gap-3 mb-7 md:max-w-sm">
        <StatTile label="Seguidores totales" :value="formatCompactNumber(totalFollowers)" />
        <StatTile label="Redes verificadas" :value="`${verifiedConnected.length} de ${VERIFIED_SOCIAL_PLATFORMS.length}`" />
      </section>

      <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-3.5">Por red social</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-7 md:max-w-3xl">
        <PlatformStatCard
          v-for="acc in accounts" :key="acc.platform"
          :platform="acc.platform" :state="socialAccountState(acc)" :followers="acc.followers" :share-pct="shareFor(acc)"
        />
      </div>

      <BaseCard radius="lg" padding="lg" class="md:max-w-xl flex items-start gap-3 mb-2">
        <Icon name="ph:info-fill" class="size-5 shrink-0 text-[var(--color-text-faint)] mt-0.5" />
        <p class="text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed">
          Alcance e interacciones por publicación todavía no están conectados para ninguna red — en Instagram falta el
          permiso de insights (pendiente de verificación de Meta); en YouTube haría falta enlazar cada entrega del
          tablero con su vídeo real, que es trabajo aparte. Por ahora solo ves seguidores/suscriptores reales.
        </p>
      </BaseCard>
    </template>

    <!-- Conexiones: conectar, actualizar y desconectar cada red -->
    <section id="conexiones" class="mt-10 scroll-mt-24" aria-labelledby="conexiones-titulo">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 mb-1 md:max-w-xl">
        <h2 id="conexiones-titulo" class="font-display text-[1.25rem] text-[var(--color-text)]">Conexiones</h2>
        <p class="text-[0.75rem] text-[var(--color-text-faint)]">{{ connectedCount }} de {{ accounts.length }} conectadas</p>
      </div>
      <p class="text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed mb-4 md:max-w-xl">
        Conecta tus cuentas para que tus métricas se actualicen solas y podamos calcular predicciones con tu historial real.
      </p>
      <div class="flex flex-col gap-2.5 md:max-w-xl">
        <SocialAccountRow
          v-for="acc in accounts" :key="acc.platform" :account="acc" :busy="busyPlatform === acc.platform"
          :syncing="syncingPlatform === acc.platform"
          @connect="toggle(acc)" @disconnect="toggle(acc)" @sync="syncAccount(acc)" @reconnect="connect(acc.platform)"
        />
      </div>
    </section>
  </AppShell>
</template>

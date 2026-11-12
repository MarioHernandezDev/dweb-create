<script setup lang="ts">
import { formatCompactNumber, VERIFIED_SOCIAL_PLATFORMS, socialAccountState, platformMeta } from '~/utils/mock-data'
import type { SocialAccount } from '~/types'

useHead({ title: 'Métricas' })

// Datos reales de `social_accounts` (ver useMySocialAccounts.ts): seguidores,
// handle, estado de la conexión y última sincronización. Nada inventado: sin
// variaciones ni históricos, que no existen todavía para el índice (hacen falta
// los snapshots de A-R8a). Instagram y YouTube son las únicas redes con OAuth
// real (VERIFIED_SOCIAL_PLATFORMS); el resto aparece como "Próximamente" y no
// entra en los totales. Alcance/interacciones por publicación tampoco están
// conectados todavía (ver el aviso al final).
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
const needsReconnect = (a: SocialAccount) => a.connected && !!a.status && a.status !== 'connected'
const reconnectCount = computed(() => verifiedConnected.value.filter(needsReconnect).length)

function shareFor(acc: SocialAccount) {
  return totalFollowers.value > 0 ? (acc.followers / totalFollowers.value) * 100 : 0
}

// Reparto del total entre redes: solo las que aportan seguidores; el texto accesible lo dice con palabras.
const segments = computed(() => verifiedConnected.value.filter((a) => a.followers > 0).map((a) => ({ acc: a, pct: shareFor(a) })))
const shareLabel = computed(() => segments.value.map((s) => `${platformMeta[s.acc.platform].label} ${Math.round(s.pct)} %`).join(', '))

const shownTotal = useCountUp(
  () => (totalFollowers.value > 0 ? { to: totalFollowers.value, format: formatCompactNumber } : undefined),
  () => formatCompactNumber(totalFollowers.value)
)
</script>

<template>
  <AppShell role="creator" title="Tus métricas" subtitle="Datos reales de tus redes conectadas" full-width>
    <!-- Avisos de la última acción sobre una red (vuelta del OAuth, desconexión, sincronización) -->
    <div v-if="connectResult || disconnectNotice || (syncError && !rowAlreadyShowsReconnect)" class="flex flex-col gap-2 mb-5" aria-live="polite">
      <p v-if="connectResult?.ok" class="text-sm text-[var(--color-status-published)]">
        Cuenta de {{ platformMeta[connectResult.platform].label }} conectada.
      </p>
      <p v-else-if="connectResult && !connectResult.ok" class="text-sm text-[var(--color-status-alert)]">{{ connectResult.reason }}</p>
      <p
        v-if="disconnectNotice" class="text-sm"
        :class="disconnectNotice.tone === 'ok' ? 'text-[var(--color-status-published)]' : disconnectNotice.tone === 'warn' ? 'text-[var(--color-text)]' : 'text-[var(--color-status-alert)]'"
      >
        {{ disconnectNotice.text }}
      </p>
      <div v-if="syncError && !rowAlreadyShowsReconnect" class="flex flex-wrap items-center gap-3">
        <p class="text-sm text-[var(--color-status-alert)]">{{ syncError }}</p>
        <BaseButton v-if="syncReconnect" variant="primary" size="sm" @click="connect(syncReconnect)">Reconectar</BaseButton>
      </div>
    </div>

    <!-- Sin ninguna red verificada -->
    <template v-if="!verifiedConnected.length">
      <div class="grid gap-6 xl:grid-cols-12 items-start">
        <div class="xl:col-span-7">
          <EmptyState
            icon="ph:chart-line-up" title="Conecta una red para ver tus métricas"
            description="Conecta Instagram o YouTube aquí abajo para empezar a ver datos reales."
          />

          <!-- La pantalla vacía no daba pista de qué aspecto tendría con datos reales: un ejemplo con números
               falsos, claramente marcado como tal y sin interacción, da contexto sin mentir. -->
          <section class="mt-8 opacity-50 pointer-events-none select-none" aria-hidden="true">
            <p class="text-sm font-semibold text-[var(--text-muted)] mb-3">Así se vería con una red conectada (ejemplo)</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <PlatformStatCard platform="instagram" state="connected" :followers="12400" :share-pct="100" handle="@tu_cuenta" />
            </div>
          </section>
        </div>
        <div class="xl:col-span-5">
          <MetricsConnections
            :accounts="accounts" :connected-count="connectedCount" :busy-platform="busyPlatform" :syncing-platform="syncingPlatform"
            @toggle="toggle" @sync="syncAccount" @reconnect="connect"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Resumen: total de seguidores y cómo se reparte entre redes -->
      <section class="yt-reveal rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-6 md:p-8 mb-8" aria-labelledby="resumen-titulo">
        <div class="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div class="lg:col-span-5">
            <h2 id="resumen-titulo" class="text-sm font-semibold text-[var(--text-muted)]">Seguidores totales</h2>
            <p class="mt-2 font-display leading-none text-[var(--color-text)] text-[3.5rem] md:text-[4.5rem]" style="font-variant-numeric: proportional-nums" :aria-label="`${totalFollowers} seguidores en total`">
              {{ shownTotal }}
            </p>
            <p class="mt-3 text-sm text-[var(--color-text-muted)]">
              Suma de {{ verifiedConnected.length }} {{ verifiedConnected.length === 1 ? 'red verificada' : 'redes verificadas' }} de {{ VERIFIED_SOCIAL_PLATFORMS.length }} disponibles.
              Dato de cada red; el total es un cálculo de CIBERAN.
            </p>
            <p v-if="reconnectCount" class="mt-2 text-sm font-medium text-[var(--color-status-alert)]">
              {{ reconnectCount === 1 ? '1 red necesita' : `${reconnectCount} redes necesitan` }} reconexión: su cifra es el último dato guardado.
            </p>
          </div>

          <div class="lg:col-span-7">
            <p class="text-sm font-semibold text-[var(--text-muted)] mb-2.5">Reparto por red</p>
            <div v-if="segments.length" class="flex h-3 rounded-full overflow-hidden bg-[var(--color-ink-overlay)] gap-0.5" role="img" :aria-label="`Reparto de seguidores: ${shareLabel}`">
              <span
                v-for="s in segments" :key="s.acc.platform" class="h-full first:rounded-l-full last:rounded-r-full transition-[flex-basis] duration-500"
                :style="{ flexBasis: `${s.pct}%`, background: platformMeta[s.acc.platform].colorVar }" :title="`${platformMeta[s.acc.platform].label}: ${Math.round(s.pct)} %`"
              />
            </div>
            <p v-else class="text-sm text-[var(--color-text-muted)]">Ninguna red conectada ha devuelto seguidores todavía.</p>
            <ul class="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--color-text-muted)]">
              <li v-for="s in segments" :key="s.acc.platform" class="inline-flex items-center gap-2" style="font-variant-numeric: tabular-nums">
                <span class="size-2.5 rounded-full" :style="{ background: platformMeta[s.acc.platform].colorVar }" aria-hidden="true" />
                {{ platformMeta[s.acc.platform].label }} · {{ formatCompactNumber(s.acc.followers) }} · {{ Math.round(s.pct) }} %
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div class="grid gap-8 2xl:grid-cols-12 items-start">
        <!-- Tus redes: una tarjeta grande por red conectada -->
        <section class="yt-reveal 2xl:col-span-7" style="--i: 1" aria-labelledby="redes-titulo">
          <h2 id="redes-titulo" class="font-display text-[1.25rem] text-[var(--color-text)] mb-3.5">Tus redes</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <PlatformStatCard
              v-for="acc in verifiedConnected" :key="acc.platform"
              :platform="acc.platform" :state="socialAccountState(acc)" :followers="acc.followers" :share-pct="shareFor(acc)"
              :handle="acc.handle" :needs-reconnect="needsReconnect(acc)" :last-synced-at="acc.lastSyncedAt ?? null"
            />
          </div>

          <BaseCard radius="lg" padding="lg" class="mt-4 flex items-start gap-3">
            <Icon name="ph:info-fill" class="size-5 shrink-0 text-[var(--color-text-faint)] mt-0.5" />
            <p class="text-sm text-[var(--color-text-muted)] leading-relaxed">
              Alcance e interacciones por publicación todavía no están conectados para ninguna red — en Instagram falta el
              permiso de insights (pendiente de verificación de Meta); en YouTube haría falta enlazar cada entrega del
              tablero con su vídeo real, que es trabajo aparte. Las estadísticas completas de YouTube están en su tarjeta.
            </p>
          </BaseCard>
        </section>

        <div class="yt-reveal 2xl:col-span-5" style="--i: 2">
          <MetricsConnections
            :accounts="accounts" :connected-count="connectedCount" :busy-platform="busyPlatform" :syncing-platform="syncingPlatform"
            @toggle="toggle" @sync="syncAccount" @reconnect="connect"
          />
        </div>
      </div>
    </template>
  </AppShell>
</template>

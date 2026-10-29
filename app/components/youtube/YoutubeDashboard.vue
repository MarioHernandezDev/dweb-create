<script setup lang="ts">
import { channelKpis } from '~/utils/youtube-kpi'
import type { YoutubeBannerKind } from '~/components/youtube/YoutubeStateBanner.vue'
import type { YoutubeConnectionState } from '~/components/youtube/YoutubeChannelHeader.vue'

/**
 * Dashboard de YouTube (A-R16c.1): cabecera del canal, banner de estado y
 * totales del canal. Es presentacional: quien lo usa (la página de Métricas)
 * carga los datos y escucha `reload` y `reconnect`. El contenido por debajo
 * (evolución, vídeos…) entra por el slot por defecto y se irá sustituyendo por
 * componentes propios en las fases siguientes.
 *
 * Estados diseñados: cargando (skeletons con la forma real, sin saltos),
 * reconectar, fallo pasajero, analíticas no disponibles y datos ocultos.
 */
interface ChannelStats {
  title: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
  channelId: string | null
  subscriberCount: number | null
  viewCount: number
  videoCount: number
  avgViewsPerVideo: number
  evolutionIssue: 'reconnect' | 'temporary' | null
}

const props = defineProps<{
  stats: ChannelStats | null
  loading: boolean
  error: string
  needsReconnect: boolean
  /** Estado guardado de la cuenta en `social_accounts` (distinto de `connected` = hay que reconectar). */
  accountStatus?: string
  lastSyncedAt?: string | null
}>()
defineEmits<{ reload: []; reconnect: [] }>()

const storedNeedsReconnect = computed(() => !!props.accountStatus && props.accountStatus !== 'connected')

const bannerKind = computed<YoutubeBannerKind | null>(() => {
  if (props.needsReconnect || storedNeedsReconnect.value) return 'reconnect'
  if (props.error) return 'temporary'
  if (props.stats?.evolutionIssue === 'reconnect') return 'analytics-reconnect'
  if (props.stats?.evolutionIssue === 'temporary') return 'analytics-temporary'
  return null
})

const connection = computed<YoutubeConnectionState>(() => {
  if (props.needsReconnect || storedNeedsReconnect.value) return 'reconnect'
  if (props.error && !props.stats) return 'error'
  if (props.stats?.evolutionIssue) return 'analytics'
  return 'ok'
})

const kpis = computed(() => (props.stats ? channelKpis(props.stats) : []))
const hero = computed(() => kpis.value.find((k) => k.hero))
const secondary = computed(() => kpis.value.filter((k) => !k.hero))

// Primera carga: sin datos todavía. Con datos y recargando, se conserva el contenido.
const firstLoad = computed(() => props.loading && !props.stats)
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Cargando por primera vez: skeletons con la forma exacta de lo que llega -->
    <template v-if="firstLoad">
      <div class="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-6 md:max-w-4xl" aria-busy="true" aria-label="Cargando tu canal de YouTube">
        <SkeletonBlock width="4rem" height="4rem" rounded="999px" />
        <div class="flex-1 flex flex-col gap-2">
          <SkeletonBlock width="55%" height="1.375rem" />
          <SkeletonBlock width="75%" height="0.8125rem" />
        </div>
        <SkeletonBlock width="6.5rem" height="2rem" rounded="var(--radius-sm)" />
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:max-w-4xl" aria-hidden="true">
        <SkeletonBlock class="col-span-2 sm:col-span-3 lg:col-span-2" height="8.5rem" rounded="var(--radius-md)" />
        <SkeletonBlock height="6.5rem" rounded="var(--radius-md)" />
        <SkeletonBlock height="6.5rem" rounded="var(--radius-md)" />
        <SkeletonBlock class="col-span-2 sm:col-span-1" height="6.5rem" rounded="var(--radius-md)" />
      </div>
    </template>

    <!-- Fallo sin datos: solo el aviso, con su acción -->
    <template v-else-if="!stats">
      <YoutubeStateBanner
        :kind="bannerKind ?? 'temporary'" :message="error || null" :busy="loading"
        @reconnect="$emit('reconnect')" @retry="$emit('reload')"
      />
      <NuxtLink to="/creator/socials" class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline w-fit">
        Gestionar conexión
      </NuxtLink>
    </template>

    <template v-else>
      <YoutubeChannelHeader
        :title="stats.title" :thumbnail-url="stats.thumbnailUrl" :published-at="stats.publishedAt" :channel-id="stats.channelId"
        :connection="connection" :last-synced-at="lastSyncedAt ?? null" :loading="loading" @reload="$emit('reload')"
      />

      <YoutubeStateBanner
        v-if="bannerKind" :kind="bannerKind" :message="error || null" :busy="loading"
        @reconnect="$emit('reconnect')" @retry="$emit('reload')"
      />

      <section aria-labelledby="yt-totals" class="md:max-w-4xl">
        <h2 id="yt-totals" class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Total del canal</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <YoutubeKpiCard v-if="hero" :kpi="hero" class="col-span-2 sm:col-span-3 lg:col-span-2" />
          <YoutubeKpiCard
            v-for="(kpi, i) in secondary" :key="kpi.key" :kpi="kpi"
            :class="i === secondary.length - 1 ? 'col-span-2 sm:col-span-1' : ''"
          />
        </div>
      </section>

      <slot :stats="stats" />
    </template>
  </div>
</template>

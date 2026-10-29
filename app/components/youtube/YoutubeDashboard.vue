<script setup lang="ts">
import { channelObservations } from '~/utils/youtube-insights'
import { channelKpis } from '~/utils/youtube-kpi'
import { formatRangeLabel, periodKpis, periodLabel } from '~/utils/youtube-period-view'
import type { YoutubeBannerKind } from '~/components/youtube/YoutubeStateBanner.vue'
import type { YoutubeConnectionState } from '~/components/youtube/YoutubeChannelHeader.vue'

/**
 * Dashboard de YouTube (A-R16c): cabecera, avisos, totales del canal,
 * selector de periodo, métricas del periodo con su variación y evolución.
 * Recibe las estadísticas del canal ya cargadas (la página las pide) y pide
 * por su cuenta el informe por periodos y los vídeos.
 *
 * Estados diseñados: cargando (skeletons con la forma real), reconectar,
 * fallo pasajero, analíticas no disponibles, canal demasiado reciente y datos
 * ocultos. Un fallo de las analíticas NO esconde los totales del canal.
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
const emit = defineEmits<{ reload: []; reconnect: [] }>()

const storedNeedsReconnect = computed(() => !!props.accountStatus && props.accountStatus !== 'connected')
const mustReconnect = computed(() => props.needsReconnect || storedNeedsReconnect.value)

// --- Informe por periodos ----------------------------------------------------------------------------------------
const {
  days, compare, report, availablePeriods, comparable, loading: analyticsLoading, error: analyticsError,
  select: selectPeriod, load: loadAnalytics, reload: reloadAnalytics
} = useYoutubeAnalytics()

// --- Vídeos ------------------------------------------------------------------------------------------------------
const {
  videos, nextPageToken, total: videosTotal, loading: videosLoading, loadingMore: videosLoadingMore, error: videosError,
  load: loadVideos, loadMore: loadMoreVideos, reload: reloadVideos
} = useYoutubeVideos()

// Rendimiento de cada vídeo en el periodo elegido (se pide aparte: un fallo no esconde la lista).
const {
  report: perfReport, byId: perfById, loading: perfLoading, error: perfError,
  load: loadPerformance, reload: reloadPerformance
} = useYoutubeVideoPerformance(days)

// Detalle de un vídeo (hoja modal); se pide solo al abrirlo.
const {
  videoId: detailId, report: detailReport, loading: detailLoading, error: detailError,
  open: openDetail, close: closeDetail, reload: reloadDetail
} = useYoutubeVideoDetail(days)
const detailVideo = computed(() => videos.value.find((v) => v.id === detailId.value) ?? null)

// Observaciones con criterio visible (reglas fijas sobre los datos ya cargados).
const observations = computed(() =>
  channelObservations({ report: report.value, performance: perfReport.value, videos: videos.value, hasMoreVideos: !!nextPageToken.value })
)

// Solo con el canal ya cargado y la conexión válida: así nunca se pide en el servidor ni se llama a Google a ciegas.
const analyticsEnabled = computed(() => !!props.stats && !mustReconnect.value)
watch(analyticsEnabled, (ok) => {
  if (!ok) return
  void loadAnalytics()
  void loadVideos()
}, { immediate: true })
// Al cambiar de periodo se piden las cifras por vídeo de ese periodo (la caché evita repetir).
watch([analyticsEnabled, days], ([ok]) => {
  if (ok) void loadPerformance()
}, { immediate: true })

const analyticsProblem = computed(() => (analyticsError.value && analyticsError.value.code !== 'period_unavailable' ? analyticsError.value : null))
const channelTooNew = computed(() => analyticsError.value?.code === 'period_unavailable')

const showCompare = computed(() => compare.value && comparable.value && !!report.value?.comparison)
const kpis = computed(() => (report.value ? periodKpis({ totals: report.value.totals, comparison: showCompare.value ? report.value.comparison : null }) : []))

// --- Avisos y estado de la conexión ----------------------------------------------------------------------------------
const bannerKind = computed<YoutubeBannerKind | null>(() => {
  if (mustReconnect.value) return 'reconnect'
  if (props.error) return 'temporary'
  if (analyticsProblem.value) return analyticsProblem.value.code === 'reconnect_required' ? 'analytics-reconnect' : 'analytics-temporary'
  return null
})

const connection = computed<YoutubeConnectionState>(() => {
  if (mustReconnect.value) return 'reconnect'
  if (props.error && !props.stats) return 'error'
  if (analyticsProblem.value) return 'analytics'
  return 'ok'
})

const channelCards = computed(() => (props.stats ? channelKpis(props.stats) : []))
const hero = computed(() => channelCards.value.find((k) => k.hero))
const secondary = computed(() => channelCards.value.filter((k) => !k.hero))

// Primera carga: sin datos todavía. Con datos y recargando, se conserva el contenido.
const firstLoad = computed(() => props.loading && !props.stats)

function onReload() {
  emit('reload')
  if (!analyticsEnabled.value) return
  void reloadAnalytics()
  void reloadVideos()
  void reloadPerformance()
}

// Si falló la primera página se pide de nuevo todo; si falló "cargar más", solo esa página (sin borrar lo ya cargado).
function onVideosRetry() {
  if (videos.value.length) void loadMoreVideos()
  else void reloadVideos()
}

// El aviso de fallo pasajero reintenta lo que falló: las estadísticas del canal o solo las analíticas.
function onRetry() {
  if (props.error) emit('reload')
  else void reloadAnalytics()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Cargando por primera vez: skeletons con la forma exacta de lo que llega -->
    <template v-if="firstLoad">
      <div class="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-6" aria-busy="true" aria-label="Cargando tu canal de YouTube">
        <SkeletonBlock width="4rem" height="4rem" rounded="999px" />
        <div class="flex-1 flex flex-col gap-2">
          <SkeletonBlock width="55%" height="1.375rem" />
          <SkeletonBlock width="75%" height="0.8125rem" />
        </div>
        <SkeletonBlock width="6.5rem" height="2rem" rounded="var(--radius-sm)" />
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-hidden="true">
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
      <NuxtLink to="/creator/metrics#conexiones" class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline w-fit">
        Gestionar conexión
      </NuxtLink>
    </template>

    <template v-else>
      <YoutubeChannelHeader
        class="yt-reveal" style="--i: 0"
        :title="stats.title" :thumbnail-url="stats.thumbnailUrl" :published-at="stats.publishedAt" :channel-id="stats.channelId"
        :connection="connection" :last-synced-at="lastSyncedAt ?? null" :loading="loading || analyticsLoading" @reload="onReload"
      />

      <YoutubeStateBanner
        v-if="bannerKind" :kind="bannerKind" :message="error || null" :busy="loading || analyticsLoading"
        @reconnect="$emit('reconnect')" @retry="onRetry"
      />

      <section aria-labelledby="yt-totals" class="yt-reveal" style="--i: 1">
        <h2 id="yt-totals" class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Total del canal</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <YoutubeKpiCard v-if="hero" :kpi="hero" class="col-span-2 sm:col-span-3 lg:col-span-2" />
          <YoutubeKpiCard
            v-for="(kpi, i) in secondary" :key="kpi.key" :kpi="kpi"
            :class="i === secondary.length - 1 ? 'col-span-2 sm:col-span-1' : ''"
          />
        </div>
      </section>

      <!-- Periodo: solo si las analíticas están disponibles; un fallo no esconde los totales de arriba -->
      <template v-if="analyticsEnabled && !analyticsProblem && !channelTooNew">
        <YoutubePeriodBar
          :model-value="days" v-model:compare="compare" :periods="availablePeriods" :comparable="comparable" :loading="analyticsLoading"
          @update:model-value="selectPeriod"
        />

        <section aria-labelledby="yt-period" class="yt-reveal" style="--i: 2" :aria-busy="analyticsLoading">
          <h2 id="yt-period" class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">{{ periodLabel(days) }}</h2>
          <p v-if="report" class="mt-0.5 mb-3 text-[0.75rem] text-[var(--color-text-faint)]">
            {{ formatRangeLabel(report.range) }} · YouTube tarda 1-2 días en procesar los datos, por eso el periodo termina hace 2 días
          </p>
          <div v-else class="mb-3 mt-0.5"><SkeletonBlock width="14rem" height="0.75rem" /></div>

          <div class="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-3" :class="analyticsLoading && report && 'opacity-60 transition-opacity'">
            <template v-if="report">
              <YoutubeKpiCard v-for="kpi in kpis" :key="kpi.key" :kpi="kpi" />
            </template>
            <template v-else>
              <SkeletonBlock v-for="n in 8" :key="n" height="6.5rem" rounded="var(--radius-md)" />
            </template>
          </div>
        </section>

        <!-- Gráfica ancha con las observaciones al lado en escritorio; apiladas en tablet y móvil -->
        <div class="grid gap-5 2xl:grid-cols-12 items-start">
          <YoutubeEvolutionPanel class="yt-reveal 2xl:col-span-8" style="--i: 3" :report="report" :loading="analyticsLoading" :show-compare="showCompare" />
          <YoutubeInsights v-if="report" class="yt-reveal 2xl:col-span-4" style="--i: 4" :observations="observations" :loading="analyticsLoading" />
        </div>
      </template>

      <p v-else-if="channelTooNew" class="text-[0.8125rem] text-[var(--color-text-muted)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
        {{ analyticsError?.message }}
      </p>

      <YoutubeVideosPanel
        class="yt-reveal" style="--i: 5"
        v-if="analyticsEnabled"
        :videos="videos" :total="videosTotal" :has-more="!!nextPageToken" :loading="videosLoading" :loading-more="videosLoadingMore" :error="videosError"
        :period-days="days" :period-range="perfReport?.range ?? null" :performance="perfById" :truncated="perfReport?.truncated ?? false"
        :performance-loading="perfLoading" :performance-error="perfError?.message ?? null" @retry-performance="loadPerformance(days, { force: true })"
        @load-more="loadMoreVideos" @retry="onVideosRetry" @reconnect="$emit('reconnect')" @open-detail="(v) => openDetail(v.id)"
      />

      <YoutubeVideoDetail
        :open="!!detailId" :video="detailVideo" :report="detailReport" :loading="detailLoading" :error="detailError"
        :days="days" :compare="showCompare" :channel-totals="report?.totals ?? null"
        :performance="perfReport" @close="closeDetail" @retry="reloadDetail" @reconnect="$emit('reconnect')"
      />
    </template>
  </div>
</template>

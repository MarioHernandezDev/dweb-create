<script setup lang="ts">
import { formatCompactNumber } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import { formatHours, formatRangeLabel, periodLabel } from '~/utils/youtube-period-view'
import {
  ENGAGEMENT_HINT, PERIOD_STATUS_LABELS, PERIOD_STATUS_REASONS, VIDEO_RANGES, VIDEO_SORTS, countDisplay, engagementRate, filterVideos, formatEngagement, formatVideoDuration,
  hasActiveFilters, periodStatus, sortVideos, videoUrl, type PerformanceById, type VideoDto, type VideoRange, type VideoSort
} from '~/utils/youtube-videos-view'

/**
 * Lista de vídeos del dashboard de YouTube (A-R16d). Presentacional: recibe
 * los vídeos cargados y avisa para cargar más o reintentar. Búsqueda, filtro
 * por fecha y orden se aplican a los vídeos CARGADOS (el contador lo dice).
 * Un me gusta o comentario ausente es "—" con su motivo, nunca 0.
 *
 * Cada tarjeta separa dos cosas (A-R16d.2): el TOTAL ACUMULADO del vídeo desde
 * que se publicó (Data API) y lo ocurrido EN el periodo elegido (Analytics API).
 * Sin cifras del periodo, el total acumulado se sigue viendo.
 */
const props = defineProps<{
  videos: VideoDto[]
  total: number | null
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: { code: string | null; message: string } | null
  periodDays: number
  periodRange: { start: string; end: string } | null
  performance: PerformanceById | null
  truncated: boolean
  performanceLoading: boolean
  performanceError: string | null
}>()
defineEmits<{ loadMore: []; retry: []; reconnect: []; retryPerformance: []; openDetail: [video: VideoDto] }>()

const query = ref('')
const range = ref<VideoRange>('all')
const sort = ref<VideoSort>('recent')

const filters = computed(() => ({ query: query.value, range: range.value }))
const filtered = computed(() => filterVideos(props.videos, filters.value))
const visible = computed(() => sortVideos(filtered.value, sort.value, props.performance))
const periodName = computed(() => periodLabel(props.periodDays).toLowerCase())
const filtering = computed(() => hasActiveFilters(filters.value))

function clearFilters() {
  query.value = ''
  range.value = 'all'
}

const bannerKind = computed(() => (props.error?.code === 'reconnect_required' ? 'reconnect' : 'temporary'))
const showSkeleton = computed(() => props.loading && !props.videos.length)

const counter = computed(() => {
  const shown = visible.value.length
  const loaded = props.videos.length
  if (props.total !== null && props.total > loaded) return `Mostrando ${shown} de los ${loaded} vídeos cargados (${props.total} en total)`
  return `${shown} ${shown === 1 ? 'vídeo' : 'vídeos'}`
})

const compact = (n: number) => formatCompactNumber(n)
</script>

<template>
  <section aria-labelledby="yt-videos">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
      <h2 id="yt-videos" class="font-display text-[1.25rem] text-[var(--color-text)]">Vídeos</h2>
      <p v-if="videos.length" class="text-micro text-[var(--color-text-faint)]" aria-live="polite">{{ counter }}</p>
    </div>

    <YoutubeStateBanner
      v-if="error && !videos.length" :kind="bannerKind" :message="error.message" :busy="loading"
      @reconnect="$emit('reconnect')" @retry="$emit('retry')"
    />

    <template v-else>
      <!-- Controles: solo si hay vídeos que buscar -->
      <div
        v-if="videos.length" data-videos-toolbar
        class="sticky z-10 -mx-5 px-5 md:-mx-8 md:px-8 py-2 mb-3 flex flex-wrap items-center gap-2.5 bg-[var(--color-ink)]/90 backdrop-blur-md"
        :style="{ top: 'calc(var(--yt-sticky-top, 0px) + var(--yt-bar-h, 0px))' }"
      >
        <div class="relative flex-1 min-w-[12rem]">
          <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-faint)] pointer-events-none" />
          <input
            v-model="query" type="search" placeholder="Buscar por título" aria-label="Buscar vídeos por título"
            class="input w-full h-11 lg:h-10 pl-9 pr-3"
          >
        </div>
        <select
          v-model="sort" aria-label="Ordenar vídeos"
          class="select h-11 lg:h-10"
        >
          <option v-for="o in VIDEO_SORTS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select
          v-model="range" aria-label="Filtrar por fecha de publicación"
          class="select h-11 lg:h-10"
        >
          <option v-for="o in VIDEO_RANGES" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <p v-if="videos.length" class="-mt-1 mb-4 text-micro leading-relaxed text-[var(--color-text-faint)]">
        <strong class="font-medium text-[var(--color-text-muted)]">Total</strong> = acumulado desde la publicación (dato de YouTube).
        <strong class="font-medium text-[var(--color-text-muted)]">Periodo</strong> = lo ocurrido
        <template v-if="periodRange">del {{ formatRangeLabel(periodRange) }}</template><template v-else>en el periodo elegido arriba</template>
        (dato de YouTube).
        <template v-if="performanceLoading && !performance"> Cargando las cifras del periodo…</template>
      </p>
      <p v-if="performanceError && videos.length" class="-mt-2 mb-4 text-sm text-[var(--color-status-alert)]" role="alert">
        {{ performanceError }}
        <button type="button" class="font-medium underline" @click="$emit('retryPerformance')">Reintentar</button>
      </p>
      <p v-if="truncated && performance" class="-mt-2 mb-4 text-micro text-[var(--color-text-faint)]">
        YouTube solo devuelve los 200 vídeos más vistos del periodo: los demás pueden no tener cifras.
      </p>

      <!-- Cargando la primera página -->
      <div v-if="showSkeleton" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Cargando vídeos">
        <SkeletonBlock v-for="n in 6" :key="n" height="6.25rem" rounded="var(--radius-md)" />
      </div>

      <!-- Sin vídeos -->
      <EmptyState
        v-else-if="!videos.length"
        icon="ph:video-camera-slash" title="Aún no hay vídeos"
        description="Cuando publiques vídeos en tu canal aparecerán aquí con sus estadísticas."
      />

      <!-- Filtros sin resultado -->
      <EmptyState
        v-else-if="!visible.length"
        icon="ph:funnel" title="Ningún vídeo coincide"
        :description="hasMore ? 'Prueba a quitar los filtros o carga más vídeos: la búsqueda solo mira los ya cargados.' : 'Prueba a quitar el buscador o el filtro de fecha.'"
      >
        <BaseButton v-if="filtering" variant="secondary" size="sm" icon="ph:x-bold" @click="clearFilters">Quitar filtros</BaseButton>
      </EmptyState>

      <ul v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <li v-for="video in visible" :key="video.id">
          <article class="group flex h-full gap-3 xl:flex-col xl:gap-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <a
              :href="videoUrl(video.id)" target="_blank" rel="noopener noreferrer" :aria-label="`Abrir «${video.title}» en YouTube`"
              class="relative block w-36 shrink-0 xl:w-full xl:aspect-video bg-[var(--color-ink-overlay)]"
            >
              <img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" alt="" loading="lazy" class="absolute inset-0 size-full object-cover">
              <span v-else class="absolute inset-0 flex items-center justify-center text-[var(--color-text-faint)]"><Icon name="ph:video-camera-fill" class="size-7" /></span>
              <span v-if="video.durationSeconds" class="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-micro font-medium text-white" style="font-variant-numeric: tabular-nums">
                {{ formatVideoDuration(video.durationSeconds) }}
              </span>
            </a>

            <div class="min-w-0 flex-1 py-3 pr-3 xl:p-3.5">
              <a :href="videoUrl(video.id)" target="_blank" rel="noopener noreferrer" class="block text-base font-medium leading-snug text-[var(--color-text)] line-clamp-2 hover:underline">
                {{ video.title }}
              </a>
              <p v-if="video.publishedAt" class="mt-0.5 text-micro text-[var(--color-text-faint)]" :title="new Date(video.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })">
                {{ relativeTime(video.publishedAt) }}
              </p>

              <p class="mt-2 text-sm font-semibold text-[var(--text-muted)]">Total</p>
              <dl class="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]" style="font-variant-numeric: tabular-nums">
                <div class="flex items-center gap-1" :title="countDisplay('views', video.viewCount).reason ?? 'Visualizaciones'">
                  <dt class="sr-only">Visualizaciones</dt>
                  <Icon name="ph:eye" class="size-3.5" />
                  <dd>{{ countDisplay('views', video.viewCount, compact).text }}</dd>
                </div>
                <div class="flex items-center gap-1" :title="countDisplay('likes', video.likeCount).reason ?? 'Me gusta'">
                  <dt class="sr-only">Me gusta</dt>
                  <Icon name="ph:thumbs-up" class="size-3.5" />
                  <dd>{{ countDisplay('likes', video.likeCount, compact).text }}</dd>
                </div>
                <div class="flex items-center gap-1" :title="countDisplay('comments', video.commentCount).reason ?? 'Comentarios'">
                  <dt class="sr-only">Comentarios</dt>
                  <Icon name="ph:chat-circle-text" class="size-3.5" />
                  <dd>{{ countDisplay('comments', video.commentCount, compact).text }}</dd>
                </div>
                <div class="flex items-center gap-1" :title="ENGAGEMENT_HINT">
                  <dt class="sr-only">Interacción</dt>
                  <Icon name="ph:lightning" class="size-3.5" />
                  <dd>{{ engagementRate(video) !== null ? formatEngagement(engagementRate(video)!) : '—' }}</dd>
                </div>
              </dl>

              <!-- Lo ocurrido EN el periodo: sin fila no se inventan ceros -->
              <template v-for="st in [periodStatus(video.id, performance, truncated)]" :key="st.kind">
                <p class="mt-2 text-sm font-semibold text-[var(--text-muted)]">{{ periodName }}</p>
                <SkeletonBlock v-if="st.kind === 'unknown' && performanceLoading" class="mt-1" width="70%" height="0.875rem" />
                <dl v-else-if="st.kind === 'data'" class="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text)]" style="font-variant-numeric: tabular-nums" data-period-stats>
                  <div class="flex items-center gap-1" title="Visualizaciones en el periodo">
                    <dt class="sr-only">Visualizaciones en el periodo</dt>
                    <Icon name="ph:eye" class="size-3.5" />
                    <dd>{{ st.performance.views === null ? '—' : compact(st.performance.views) }}</dd>
                  </div>
                  <div class="flex items-center gap-1" title="Tiempo de visualización en el periodo">
                    <dt class="sr-only">Tiempo de visualización en el periodo</dt>
                    <Icon name="ph:clock" class="size-3.5" />
                    <dd>{{ st.performance.estimatedMinutesWatched === null ? '—' : formatHours(st.performance.estimatedMinutesWatched) }}</dd>
                  </div>
                  <div class="flex items-center gap-1" title="Me gusta en el periodo">
                    <dt class="sr-only">Me gusta en el periodo</dt>
                    <Icon name="ph:thumbs-up" class="size-3.5" />
                    <dd>{{ st.performance.likes === null ? '—' : compact(st.performance.likes) }}</dd>
                  </div>
                  <div class="flex items-center gap-1" title="Comentarios en el periodo">
                    <dt class="sr-only">Comentarios en el periodo</dt>
                    <Icon name="ph:chat-circle-text" class="size-3.5" />
                    <dd>{{ st.performance.comments === null ? '—' : compact(st.performance.comments) }}</dd>
                  </div>
                </dl>
                <p v-else class="mt-0.5 text-sm text-[var(--color-text-faint)]" :title="PERIOD_STATUS_REASONS[st.kind]" data-period-none>
                  — <span class="text-micro">{{ PERIOD_STATUS_LABELS[st.kind] }}</span>
                </p>
              </template>

              <button
                type="button" class="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-text)] hover:underline"
                :aria-label="`Ver el detalle de «${video.title}»`" data-open-detail @click="$emit('openDetail', video)"
              >
                Ver detalle <Icon name="ph:caret-right-bold" class="size-3" />
              </button>
            </div>
          </article>
        </li>
      </ul>

      <div v-if="hasMore && videos.length" class="mt-4 flex justify-center">
        <BaseButton variant="secondary" size="sm" :icon-spin="loadingMore" :disabled="loadingMore" @click="$emit('loadMore')">
          {{ loadingMore ? 'Cargando…' : 'Cargar más vídeos' }}
        </BaseButton>
      </div>

      <p v-if="error && videos.length" class="mt-3 text-sm text-[var(--color-status-alert)]" role="alert">
        {{ error.message }}
        <button type="button" class="font-medium underline" @click="$emit('retry')">Reintentar</button>
      </p>
    </template>
  </section>
</template>

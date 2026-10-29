<script setup lang="ts">
import { formatCompactNumber } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import {
  ENGAGEMENT_HINT, VIDEO_RANGES, VIDEO_SORTS, countDisplay, engagementRate, filterVideos, formatEngagement, formatVideoDuration,
  hasActiveFilters, sortVideos, videoUrl, type VideoDto, type VideoRange, type VideoSort
} from '~/utils/youtube-videos-view'

/**
 * Lista de vídeos del dashboard de YouTube (A-R16d). Presentacional: recibe
 * los vídeos cargados y avisa para cargar más o reintentar. Búsqueda, filtro
 * por fecha y orden se aplican a los vídeos CARGADOS (el contador lo dice).
 * Un me gusta o comentario ausente es "—" con su motivo, nunca 0.
 */
const props = defineProps<{
  videos: VideoDto[]
  total: number | null
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: { code: string | null; message: string } | null
}>()
defineEmits<{ loadMore: []; retry: []; reconnect: [] }>()

const query = ref('')
const range = ref<VideoRange>('all')
const sort = ref<VideoSort>('recent')

const filters = computed(() => ({ query: query.value, range: range.value }))
const filtered = computed(() => filterVideos(props.videos, filters.value))
const visible = computed(() => sortVideos(filtered.value, sort.value))
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
  <section aria-labelledby="yt-videos" class="md:max-w-4xl">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
      <h2 id="yt-videos" class="font-display text-[1.25rem] text-[var(--color-text)]">Vídeos</h2>
      <p v-if="videos.length" class="text-[0.75rem] text-[var(--color-text-faint)]" aria-live="polite">{{ counter }}</p>
    </div>

    <YoutubeStateBanner
      v-if="error && !videos.length" :kind="bannerKind" :message="error.message" :busy="loading"
      @reconnect="$emit('reconnect')" @retry="$emit('retry')"
    />

    <template v-else>
      <!-- Controles: solo si hay vídeos que buscar -->
      <div v-if="videos.length" class="flex flex-wrap items-center gap-2.5 mb-4">
        <div class="relative flex-1 min-w-[12rem]">
          <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-faint)] pointer-events-none" />
          <input
            v-model="query" type="search" placeholder="Buscar por título" aria-label="Buscar vídeos por título"
            class="w-full h-10 pl-9 pr-3 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]"
          >
        </div>
        <select
          v-model="sort" aria-label="Ordenar vídeos"
          class="h-10 px-3 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)]"
        >
          <option v-for="o in VIDEO_SORTS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select
          v-model="range" aria-label="Filtrar por fecha de publicación"
          class="h-10 px-3 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)]"
        >
          <option v-for="o in VIDEO_RANGES" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <!-- Cargando la primera página -->
      <div v-if="showSkeleton" class="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Cargando vídeos">
        <SkeletonBlock v-for="n in 4" :key="n" height="6.25rem" rounded="var(--radius-md)" />
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

      <ul v-else class="grid gap-3 md:grid-cols-2">
        <li v-for="video in visible" :key="video.id">
          <article class="group flex h-full gap-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <a
              :href="videoUrl(video.id)" target="_blank" rel="noopener noreferrer" :aria-label="`Abrir «${video.title}» en YouTube`"
              class="relative block w-36 shrink-0 bg-[var(--color-ink-overlay)]"
            >
              <img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" alt="" loading="lazy" class="absolute inset-0 size-full object-cover">
              <span v-else class="absolute inset-0 flex items-center justify-center text-[var(--color-text-faint)]"><Icon name="ph:video-camera-fill" class="size-7" /></span>
              <span v-if="video.durationSeconds" class="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white" style="font-variant-numeric: tabular-nums">
                {{ formatVideoDuration(video.durationSeconds) }}
              </span>
            </a>

            <div class="min-w-0 flex-1 py-3 pr-3">
              <a :href="videoUrl(video.id)" target="_blank" rel="noopener noreferrer" class="block text-[0.9375rem] font-medium leading-snug text-[var(--color-text)] line-clamp-2 hover:underline">
                {{ video.title }}
              </a>
              <p v-if="video.publishedAt" class="mt-0.5 text-[0.75rem] text-[var(--color-text-faint)]" :title="new Date(video.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })">
                {{ relativeTime(video.publishedAt) }}
              </p>

              <dl class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-[var(--color-text-muted)]" style="font-variant-numeric: tabular-nums">
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
            </div>
          </article>
        </li>
      </ul>

      <div v-if="hasMore && videos.length" class="mt-4 flex justify-center">
        <BaseButton variant="secondary" size="sm" :icon-spin="loadingMore" :disabled="loadingMore" @click="$emit('loadMore')">
          {{ loadingMore ? 'Cargando…' : 'Cargar más vídeos' }}
        </BaseButton>
      </div>

      <p v-if="error && videos.length" class="mt-3 text-[0.8125rem] text-[var(--color-status-alert)]" role="alert">
        {{ error.message }}
        <button type="button" class="font-medium underline" @click="$emit('retry')">Reintentar</button>
      </p>
    </template>
  </section>
</template>

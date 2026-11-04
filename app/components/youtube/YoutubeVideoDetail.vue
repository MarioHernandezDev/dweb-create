<script setup lang="ts">
import { formatCompactNumber } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import { VERDICT_TEXT, videoVsChannel } from '~/utils/youtube-insights'
import { chartSeries, formatRangeLabel, periodKpis, periodLabel, type PeriodTotalsDto } from '~/utils/youtube-period-view'
import {
  countDisplay, formatVideoDuration, videoUrl, type VideoDetailReport, type VideoDto, type VideoPerformanceReport
} from '~/utils/youtube-videos-view'

/**
 * Detalle de un vídeo (A-R16d.3) en una hoja modal accesible (`BottomSheet`:
 * foco, Escape y devolución del foco). Separa SIEMPRE el total acumulado del
 * vídeo (Data API) de lo ocurrido en el periodo (Analytics API). Reglas:
 *  - Dato ausente = "—" con su motivo, nunca 0.
 *  - Si el vídeo se publicó dentro del periodo, se avisa y no se compara.
 *  - "Frente a lo habitual del canal" enseña el CRITERIO de cada comparación.
 *  - Un fallo del detalle no tumba nada más del dashboard.
 */
const props = defineProps<{
  open: boolean
  /** Vídeo tal como sale en la lista: sirve de cabecera mientras llega el detalle. */
  video: VideoDto | null
  report: VideoDetailReport | null
  loading: boolean
  error: { code: string | null; message: string } | null
  days: number
  compare: boolean
  channelTotals: PeriodTotalsDto | null
  performance: Pick<VideoPerformanceReport, 'videos' | 'truncated'> | null
}>()
const emit = defineEmits<{ close: []; retry: []; reconnect: [] }>()

const shown = computed(() => props.report?.video ?? props.video)
const title = computed(() => shown.value?.title ?? 'Detalle del vídeo')

const kpis = computed(() => {
  if (!props.report) return []
  const showCompare = props.compare && !!props.report.comparison
  return periodKpis({ totals: props.report.totals, comparison: showCompare ? props.report.comparison : null })
    .filter((k) => k.key !== 'netSubscribers')
})

const hasViews = computed(() => (props.report?.series ?? []).some((p) => p.views !== null))
const series = computed(() => (props.report ? chartSeries(props.report, 'views') : null))
const comparing = computed(() => props.compare && !!series.value?.previous)

const comparisons = computed(() =>
  props.report
    ? videoVsChannel({ videoTotals: props.report.totals, channelTotals: props.channelTotals, performance: props.performance, partialPeriod: props.report.partialPeriod })
    : []
)

const verdictColor = { above: 'var(--color-status-published)', similar: 'var(--color-text-muted)', below: 'var(--color-status-alert)' } as const
const verdictIcon = { above: 'ph:arrow-up-bold', similar: 'ph:equals-bold', below: 'ph:arrow-down-bold' } as const

const compact = (n: number) => formatCompactNumber(n)
const isReconnect = computed(() => props.error?.code === 'reconnect_required')
</script>

<template>
  <BottomSheet :model-value="open" :title="title" wide @update:model-value="(v: boolean) => !v && emit('close')">
    <div class="flex flex-col gap-5" :aria-busy="loading">
      <!-- Cabecera: miniatura, enlace y datos fijos del vídeo -->
      <div v-if="shown" class="flex gap-3">
        <a :href="videoUrl(shown.id)" target="_blank" rel="noopener noreferrer" :aria-label="`Abrir «${shown.title}» en YouTube`" class="relative block w-28 shrink-0 aspect-video overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)]">
          <img v-if="shown.thumbnailUrl" :src="shown.thumbnailUrl" alt="" class="absolute inset-0 size-full object-cover">
          <span v-else class="absolute inset-0 flex items-center justify-center text-[var(--color-text-faint)]"><Icon name="ph:video-camera-fill" class="size-6" /></span>
        </a>
        <div class="min-w-0 text-sm text-[var(--color-text-muted)]">
          <p v-if="shown.publishedAt" :title="new Date(shown.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })">
            Publicado {{ relativeTime(shown.publishedAt) }}
          </p>
          <p v-if="shown.durationSeconds">Duración {{ formatVideoDuration(shown.durationSeconds) }}</p>
          <a :href="videoUrl(shown.id)" target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex items-center gap-1 font-medium text-[var(--color-text)] hover:underline">
            Ver en YouTube <Icon name="ph:arrow-square-out" class="size-3.5" />
          </a>
        </div>
      </div>

      <!-- Total acumulado (Data API) -->
      <section v-if="shown" aria-label="Total acumulado">
        <h3 class="text-sm font-semibold text-[var(--text-muted)]">Total · desde la publicación</h3>
        <dl class="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--color-text)]" style="font-variant-numeric: tabular-nums">
          <div class="flex items-center gap-1.5" :title="countDisplay('views', shown.viewCount).reason ?? 'Visualizaciones'">
            <dt class="sr-only">Visualizaciones</dt><Icon name="ph:eye" class="size-4" /><dd>{{ countDisplay('views', shown.viewCount, compact).text }}</dd>
          </div>
          <div class="flex items-center gap-1.5" :title="countDisplay('likes', shown.likeCount).reason ?? 'Me gusta'">
            <dt class="sr-only">Me gusta</dt><Icon name="ph:thumbs-up" class="size-4" /><dd>{{ countDisplay('likes', shown.likeCount, compact).text }}</dd>
          </div>
          <div class="flex items-center gap-1.5" :title="countDisplay('comments', shown.commentCount).reason ?? 'Comentarios'">
            <dt class="sr-only">Comentarios</dt><Icon name="ph:chat-circle-text" class="size-4" /><dd>{{ countDisplay('comments', shown.commentCount, compact).text }}</dd>
          </div>
        </dl>
        <p class="mt-1 text-micro text-[var(--color-text-faint)]">Dato de YouTube</p>
      </section>

      <!-- Error -->
      <div v-if="error && !report" class="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 text-sm" role="alert">
        <p class="text-[var(--color-text)]">{{ error.message }}</p>
        <div class="mt-3 flex gap-2">
          <BaseButton v-if="isReconnect" size="sm" icon="ph:plug" @click="emit('reconnect')">Reconectar YouTube</BaseButton>
          <BaseButton v-else variant="secondary" size="sm" icon="ph:arrow-clockwise" :disabled="loading" @click="emit('retry')">Reintentar</BaseButton>
        </div>
      </div>

      <!-- Cargando -->
      <div v-else-if="!report" class="flex flex-col gap-3" aria-label="Cargando el detalle del vídeo">
        <SkeletonBlock width="60%" height="0.875rem" />
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3"><SkeletonBlock v-for="n in 4" :key="n" height="6.5rem" rounded="var(--radius-md)" /></div>
        <SkeletonBlock height="12rem" rounded="var(--radius-md)" />
      </div>

      <template v-else>
        <!-- Periodo -->
        <section aria-label="Rendimiento en el periodo">
          <h3 class="text-sm font-semibold text-[var(--text-muted)]">{{ periodLabel(days) }}</h3>
          <p class="mt-0.5 text-micro text-[var(--color-text-faint)]">{{ formatRangeLabel(report.range) }} · dato de YouTube</p>
          <p v-if="report.partialPeriod" class="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] px-3 py-2 text-sm text-[var(--color-text-muted)]" data-partial-note>
            Este vídeo se publicó dentro del periodo: las cifras cubren solo desde su publicación, así que no se compara con el periodo anterior.
          </p>
          <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <YoutubeKpiCard v-for="kpi in kpis" :key="kpi.key" :kpi="kpi" />
          </div>
        </section>

        <!-- Evolución diaria de visualizaciones -->
        <section aria-label="Visualizaciones por día">
          <h3 class="text-sm font-semibold text-[var(--text-muted)] mb-2">Visualizaciones por día</h3>
          <YoutubeEvolutionChart v-if="hasViews && series" :series="series" metric="views" :show-compare="comparing" :height="200" />
          <p v-else class="text-sm text-[var(--color-text-muted)]">YouTube no ha devuelto visualizaciones diarias de este vídeo para el periodo.</p>
          <p v-if="series && series.gaps > 0 && hasViews" class="mt-1 text-micro text-[var(--color-text-faint)]">
            {{ series.gaps }} {{ series.gaps === 1 ? 'día sin dato' : 'días sin dato' }} de YouTube (no se rellenan con ceros)
          </p>
        </section>

        <!-- Frente a lo habitual del canal, con el criterio a la vista -->
        <section aria-label="Frente a lo habitual del canal">
          <h3 class="text-sm font-semibold text-[var(--text-muted)]">Frente a lo habitual del canal</h3>
          <ul v-if="comparisons.length" class="mt-2 grid gap-3 md:grid-cols-3">
            <li v-for="row in comparisons" :key="row.key" class="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] p-3" data-comparison>
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-[var(--color-text)]">{{ row.label }}</span>
                <span class="inline-flex items-center gap-1 font-medium" :style="{ color: verdictColor[row.verdict] }">
                  <Icon :name="verdictIcon[row.verdict]" class="size-3.5" /> {{ VERDICT_TEXT[row.verdict] }}
                </span>
              </div>
              <p class="mt-0.5 text-sm text-[var(--color-text-muted)]" style="font-variant-numeric: tabular-nums">
                {{ row.videoText }} frente a {{ row.referenceText }} ({{ row.referenceLabel }})
              </p>
              <p class="mt-1 text-micro leading-relaxed text-[var(--color-text-faint)]">Criterio: {{ row.criterion }}</p>
              <p class="text-micro text-[var(--color-text-faint)]">Cálculo de CIBERAN sobre datos de YouTube</p>
            </li>
          </ul>
          <p v-else class="mt-2 text-sm text-[var(--color-text-muted)]">
            No hay datos suficientes para comparar este vídeo con el canal en este periodo.
          </p>
        </section>
      </template>
    </div>
  </BottomSheet>
</template>

<script setup lang="ts">
import { CHART_METRICS, chartSeries, periodLabel, type AnalyticsReportDto, type ChartMetric } from '~/utils/youtube-period-view'

/**
 * Bloque "Evolución": pestañas de métrica + gráfica + leyenda. Una sola
 * magnitud por gráfica (escalas distintas no comparten eje). Dice cuántos días
 * no tienen dato en vez de rellenarlos con ceros.
 */
const props = defineProps<{ report: AnalyticsReportDto | null; loading: boolean; showCompare: boolean }>()

const metric = ref<ChartMetric>('views')
const series = computed(() => (props.report ? chartSeries(props.report, metric.value) : null))
const hasData = computed(() => series.value?.current.some((p) => p.value !== null) ?? false)
const comparing = computed(() => props.showCompare && !!series.value?.previous)
</script>

<template>
  <section aria-labelledby="yt-evolution">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
      <h2 id="yt-evolution" class="font-display text-[1.25rem] text-[var(--color-text)]">Evolución</h2>
      <SegmentedTabs :options="CHART_METRICS" :model-value="metric" @update:model-value="metric = $event as ChartMetric" />
    </div>

    <BaseCard radius="lg" padding="lg" :aria-busy="loading">
      <SkeletonBlock v-if="!report || !series" height="16.25rem" rounded="var(--radius-md)" />

      <p v-else-if="!hasData" class="py-10 text-center text-[0.875rem] text-[var(--color-text-muted)]">
        YouTube no ha devuelto datos de {{ CHART_METRICS.find((m) => m.value === metric)?.unit }} para este periodo.
      </p>

      <div v-else :class="loading && 'opacity-60 transition-opacity'">
        <YoutubeEvolutionChart :series="series" :metric="metric" :show-compare="comparing" :height="320" />

        <ul class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.75rem] text-[var(--color-text-muted)]">
          <li class="inline-flex items-center gap-2">
            <span class="inline-block w-5 border-t-2 border-[var(--color-chart-primary)]" aria-hidden="true" />
            {{ periodLabel(report.days) }}
          </li>
          <li v-if="comparing" class="inline-flex items-center gap-2">
            <span class="inline-block w-5 border-t-2 border-dashed border-[var(--color-text-faint)]" aria-hidden="true" />
            Periodo anterior
          </li>
          <li v-if="series.gaps > 0" class="text-[var(--color-text-faint)]">
            {{ series.gaps }} {{ series.gaps === 1 ? 'día sin dato' : 'días sin dato' }} de YouTube (no se rellenan con ceros)
          </li>
        </ul>
      </div>
    </BaseCard>
  </section>
</template>

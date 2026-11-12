<script setup lang="ts">
import {
  HISTORY_METRICS, historyCounts, historySeries, historySummary, historySummaryText, type HistoryMetric, type SnapshotRow
} from '~/utils/account-history-view'
import { formatCompactNumber } from '~/utils/mock-data'

/**
 * Histórico propio de CIBERAN (A-R16e): suscriptores y visualizaciones TOTALES
 * del canal a lo largo del tiempo, a partir de los registros diarios que
 * CIBERAN guarda al leer la cuenta (`social_account_snapshots`). Google no da
 * esos acumulados con histórico, por eso empiezan el día del primer registro.
 *
 * Reglas: solo hay puntos los días en que se leyó el canal (los demás son
 * huecos, no se rellenan); con menos de 2 registros se explica que el
 * histórico acaba de empezar en vez de dibujar nada; un acumulado que el canal
 * oculta no se dibuja.
 */
const props = defineProps<{ rows: SnapshotRow[]; loading: boolean; loaded: boolean; error: string | null }>()
defineEmits<{ retry: [] }>()

const counts = computed(() => historyCounts(props.rows))
// Solo se ofrecen las métricas con algún registro; si ninguna, el estado vacío lo explica.
const options = computed(() => HISTORY_METRICS.filter((m) => counts.value[m.value] > 0))
const metric = ref<HistoryMetric>('followers')
watch(options, (list) => {
  if (list.length && !list.some((o) => o.value === metric.value)) metric.value = list[0]!.value
}, { immediate: true })

const series = computed(() => historySeries(props.rows, metric.value))
const summary = computed(() => historySummary(props.rows, metric.value))
const onlyOnePoint = computed(() => counts.value[metric.value] === 1)
const lastValue = computed(() => {
  const s = historySummary(props.rows, metric.value)
  if (s) return s.to.value
  const only = props.rows.find((r) => (metric.value === 'followers' ? r.followers_count : r.views_total) !== null)
  return only ? (metric.value === 'followers' ? only.followers_count : only.views_total) : null
})
const unit = computed(() => HISTORY_METRICS.find((m) => m.value === metric.value)?.unit ?? '')
</script>

<template>
  <section aria-labelledby="yt-history">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div>
        <h2 id="yt-history" class="font-display text-[1.25rem] text-[var(--color-text)]">Histórico propio</h2>
        <p class="mt-0.5 text-micro text-[var(--color-text-faint)]">
          Totales del canal que CIBERAN guarda cada día que lee tu cuenta: YouTube solo da el valor actual, por eso este histórico empieza el día del primer registro.
        </p>
      </div>
      <SegmentedTabs v-if="options.length > 1" :options="options" :model-value="metric" @update:model-value="metric = $event as HistoryMetric" />
    </div>

    <BaseCard radius="lg" padding="lg" :aria-busy="loading">
      <SkeletonBlock v-if="loading && !loaded" height="14rem" rounded="var(--radius-md)" />

      <div v-else-if="error" class="py-6 text-center" role="alert">
        <p class="text-sm text-[var(--color-text-muted)]">{{ error }}</p>
        <BaseButton class="mt-3" variant="secondary" size="sm" icon="ph:arrow-clockwise" @click="$emit('retry')">Reintentar</BaseButton>
      </div>

      <p v-else-if="!options.length" class="py-8 text-center text-sm text-[var(--color-text-muted)]">
        Todavía no hay registros. Empezamos a guardar tu histórico la próxima vez que se lea tu canal; vuelve en unos días para ver cómo evoluciona.
      </p>

      <div v-else-if="onlyOnePoint || !series" class="py-8 text-center">
        <p class="font-display text-[2rem] leading-none text-[var(--color-text)]" style="font-variant-numeric: proportional-nums">
          {{ lastValue !== null ? formatCompactNumber(lastValue) : '—' }}
        </p>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">{{ unit }} en el primer registro</p>
        <p class="mt-3 text-sm text-[var(--color-text-muted)]">
          El histórico acaba de empezar: la evolución aparecerá en cuanto haya registros de más de un día.
        </p>
      </div>

      <div v-else>
        <p v-if="summary" class="mb-3 text-sm text-[var(--color-text)]" data-history-summary>{{ historySummaryText(summary) }}</p>
        <YoutubeEvolutionChart :series="series" metric="views" :show-compare="false" :height="260" :zero-based="false" connect-points />
        <ul class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-micro text-[var(--color-text-muted)]">
          <li class="inline-flex items-center gap-2">
            <span class="inline-block w-5 border-t-2 border-[var(--color-chart-primary)]" aria-hidden="true" /> {{ unit }}
          </li>
          <li class="text-[var(--color-text-faint)]">
            {{ summary?.recordedDays }} días con registro
            <template v-if="series.gaps > 0"> · {{ series.gaps }} {{ series.gaps === 1 ? 'día sin registro' : 'días sin registro' }} (sin dato, no se inventan)</template>
          </li>
          <li class="text-[var(--color-text-faint)]">Dato de YouTube guardado por CIBERAN · la variación es un cálculo de CIBERAN</li>
          <li class="text-[var(--color-text-faint)]">Cada punto es un día con registro; la línea solo los une. El eje no empieza en 0 para que se vea el cambio.</li>
        </ul>
      </div>
    </BaseCard>
  </section>
</template>

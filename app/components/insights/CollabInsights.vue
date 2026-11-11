<script setup lang="ts">
import type { MetricsResult } from '~~/server/utils/collab-metrics'
import { INSIGHT_RANGES, METRIC_NOTES, NO_DATA, formatDecimal, formatEurosAvg, formatHours, formatPct, monthLabel, sampleNote } from '~/utils/insights-view'

/**
 * Resultados dentro de CIBERAN: métricas propias calculadas con las colaboraciones, la
 * cronología y las valoraciones (server/utils/collab-metrics.ts). No son las métricas de
 * redes sociales. Sirve para el creador, la marca y la vista general de admin (`scope`).
 */
const props = defineProps<{
  metrics: MetricsResult | null
  scope: 'creator' | 'partner' | 'platform'
  range: string
  loading?: boolean
  error?: string
}>()
const emit = defineEmits<{ 'update:range': [value: string]; retry: [] }>()

const m = computed(() => props.metrics)
const isCreator = computed(() => props.scope === 'creator')
const isPlatform = computed(() => props.scope === 'platform')
const empty = computed(() => !!m.value && m.value.totals.started === 0)

// ---- Embudo: de iniciadas a completadas ----
const funnel = computed(() => {
  const t = m.value?.totals
  if (!t) return []
  const max = Math.max(1, t.started)
  return [
    { key: 'started', label: 'Iniciadas', value: t.started, tone: 'ink' },
    { key: 'accepted', label: 'Aceptadas', value: t.accepted, tone: 'blue' },
    { key: 'completed', label: 'Completadas', value: t.completed, tone: 'green' },
    { key: 'cancelled', label: 'Canceladas de común acuerdo', value: t.cancelled, tone: 'muted' },
    { key: 'terminated', label: 'Terminadas por incumplimiento', value: t.terminated, tone: 'alert' }
  ].map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }))
})
const rest = computed(() => {
  const t = m.value?.totals
  if (!t) return ''
  const parts = [t.open && `${t.open} en curso`, t.pending && `${t.pending} sin responder`, t.declined && `${t.declined} rechazada${t.declined === 1 ? '' : 's'}`].filter(Boolean)
  return parts.length ? `Además: ${parts.join(' · ')}.` : ''
})

// ---- Evolución por mes (solo con dos meses o más: un mes suelto no es una evolución) ----
const monthsWithData = computed(() => (m.value?.byMonth ?? []).filter((r) => r.started > 0).length)
const showEvolution = computed(() => (m.value?.byMonth.length ?? 0) >= 2 && monthsWithData.value >= 1)
const monthLabels = computed(() => (m.value?.byMonth ?? []).map((r) => monthLabel(r.month)))
const monthSeries = computed(() => {
  const rows = m.value?.byMonth ?? []
  return [
    { label: 'Iniciadas', color: 'var(--color-tinta-950)', values: rows.map((r) => r.started) },
    { label: 'Aceptadas', color: 'var(--color-phase-scheduled)', values: rows.map((r) => r.accepted) },
    { label: 'Completadas', color: 'var(--color-phase-published)', values: rows.map((r) => r.completed) }
  ]
})
const monthSummary = computed(() => (m.value?.byMonth ?? []).map((r) => `${monthLabel(r.month)}: ${r.started} iniciadas, ${r.accepted} aceptadas, ${r.completed} completadas`).join('; '))

const categories = computed(() => {
  const list = (m.value?.byCategory ?? []).slice(0, 8)
  const max = Math.max(1, ...list.map((c) => c.count))
  return list.map((c) => ({ ...c, pct: Math.round((c.count / max) * 100) }))
})
const categoryTitle = computed(() => (isPlatform.value ? 'Por categoría del creador' : isCreator.value ? 'Por categoría de la marca' : 'Por categoría del creador'))

const onTimeNote = computed(() => {
  const o = m.value?.onTime
  if (!o) return ''
  const base = o.rate ? `${o.onTime} a tiempo y ${o.late} tarde` : 'Aún no hay entregas con fecha que hayan vencido o se hayan entregado'
  const out = [o.notDueYet && `${o.notDueYet} todavía en plazo`, o.noDueDate && `${o.noDueDate} sin fecha`, o.unknown && `${o.unknown} sin registro de cuándo se entregaron`].filter(Boolean)
  return out.length ? `${base}. Fuera del cálculo: ${out.join(', ')}.` : `${base}.`
})
const fmtInt = (v: number) => String(v)
</script>

<template>
  <div class="insights" data-insights :data-scope="scope">
    <div class="insights__bar">
      <SegmentedTabs :model-value="range" :options="INSIGHT_RANGES" label="Periodo" @update:model-value="emit('update:range', $event)" />
      <p class="insights__hint">Calculado con la actividad dentro de CIBERAN. No incluye datos de redes sociales.</p>
    </div>

    <div v-if="error" class="insights__error" role="alert">
      <p>{{ error }}</p>
      <BaseButton variant="outline" size="sm" @click="emit('retry')">Reintentar</BaseButton>
    </div>
    <div v-else-if="loading && !m" aria-busy="true" class="insights__tiles">
      <SkeletonBlock v-for="n in 4" :key="n" height="6rem" rounded="var(--radius-lg)" />
    </div>
    <EmptyState
      v-else-if="empty" icon="ph:chart-bar"
      title="Todavía no hay colaboraciones en este periodo"
      :description="isPlatform ? 'Cuando haya actividad, aquí verás cómo se inician, se aceptan y se cierran.' : 'Cuando inicies o recibas la primera, aquí verás cuántas se aceptan, cuántas terminan bien y cuánto se tarda.'"
    >
      <BaseButton v-if="!isPlatform" :to="`/${scope}/discover`" variant="primary" size="sm">Ir a Descubrir</BaseButton>
    </EmptyState>

    <template v-else-if="m">
      <section class="insights__tiles" :class="loading && 'is-loading'" aria-label="Indicadores principales">
        <div class="insight" data-metric="success">
          <p class="insight__label">Completadas con éxito</p>
          <p class="insight__value">{{ formatPct(m.successRate) }}</p>
          <p class="insight__note">{{ sampleNote(m.successRate, 'colaboración cerrada', 'colaboraciones cerradas') }}</p>
        </div>
        <div class="insight" data-metric="on-time">
          <p class="insight__label">{{ isCreator ? 'Entregas a tiempo' : 'Entregas recibidas a tiempo' }}</p>
          <p class="insight__value">{{ formatPct(m.onTime.rate) }}</p>
          <p class="insight__note">{{ sampleNote(m.onTime.rate, 'entrega con fecha', 'entregas con fecha') }}</p>
        </div>
        <div class="insight" data-metric="rating">
          <p class="insight__label">{{ isPlatform ? 'Valoración media' : 'Valoración recibida' }}</p>
          <p class="insight__value">{{ formatDecimal(m.rating) }}<small v-if="m.rating"> / 5</small></p>
          <p class="insight__note">{{ sampleNote(m.rating, 'valoración', 'valoraciones') }}</p>
        </div>
        <div class="insight" data-metric="budget">
          <p class="insight__label">Presupuesto medio</p>
          <p class="insight__value">{{ formatEurosAvg(m.avgBudgetCents) }}</p>
          <p class="insight__note">{{ sampleNote(m.avgBudgetCents, 'colaboración aceptada con importe', 'colaboraciones aceptadas con importe') }}</p>
        </div>
      </section>

      <div class="insights__grid">
        <PanelCard title="Colaboraciones" description="De la solicitud al cierre, en el periodo elegido.">
          <ul class="ibars" data-funnel>
            <li v-for="r in funnel" :key="r.key" class="ibars__row" :data-tone="r.tone">
              <span class="ibars__label">{{ r.label }}</span>
              <span class="ibars__track"><span class="ibars__fill" :style="{ width: `${r.pct}%` }" /></span>
              <b class="ibars__value">{{ r.value }}</b>
            </li>
          </ul>
          <p v-if="rest" class="insights__foot">{{ rest }}</p>
        </PanelCard>

        <PanelCard title="Tiempos y revisiones" description="Solo con fechas exactas de la cronología.">
          <dl class="ifacts">
            <template v-if="isPlatform">
              <div><dt>Los creadores responden en</dt><dd>{{ formatHours(m.responseHours.creators) }}<small>{{ sampleNote(m.responseHours.creators, 'solicitud', 'solicitudes') }}</small></dd></div>
              <div><dt>Las marcas responden en</dt><dd>{{ formatHours(m.responseHours.partners) }}<small>{{ sampleNote(m.responseHours.partners, 'solicitud', 'solicitudes') }}</small></dd></div>
            </template>
            <template v-else>
              <div><dt>Tú respondes en</dt><dd>{{ formatHours(m.responseHours.mine) }}<small>{{ sampleNote(m.responseHours.mine, 'solicitud recibida', 'solicitudes recibidas') }}</small></dd></div>
              <div><dt>{{ isCreator ? 'Las marcas te responden en' : 'Los creadores te responden en' }}</dt><dd>{{ formatHours(m.responseHours.counterpart) }}<small>{{ sampleNote(m.responseHours.counterpart, 'solicitud enviada', 'solicitudes enviadas') }}</small></dd></div>
            </template>
            <div><dt>De la propuesta a la aceptación</dt><dd>{{ formatHours(m.hoursToAccept) }}<small>{{ sampleNote(m.hoursToAccept, 'colaboración aceptada', 'colaboraciones aceptadas') }}</small></dd></div>
            <div><dt>Revisiones por entregable</dt><dd>{{ formatDecimal(m.revisionsPerDeliverable) }}<small>{{ sampleNote(m.revisionsPerDeliverable, 'entrega enviada', 'entregas enviadas') }}</small></dd></div>
          </dl>
          <p class="insights__foot">{{ onTimeNote }}</p>
        </PanelCard>

        <PanelCard title="Evolución por mes" description="Según el mes en que se inició cada colaboración." class="insights__wide">
          <figure v-if="showEvolution" class="insights__chart">
            <div role="img" :aria-label="`Colaboraciones por mes. ${monthSummary}`">
              <BarChart :labels="monthLabels" :series="monthSeries" :format-value="fmtInt" :height="200" />
            </div>
            <figcaption class="insights__legend">
              <span v-for="s in monthSeries" :key="s.label"><i :style="{ background: s.color }" />{{ s.label }}</span>
            </figcaption>
          </figure>
          <p v-else class="insights__foot">Hace falta actividad en al menos dos meses para dibujar una evolución.</p>
        </PanelCard>

        <PanelCard :title="categoryTitle" description="Una colaboración cuenta en cada categoría de esa ficha.">
          <ul v-if="categories.length" class="ibars" data-categories>
            <li v-for="c in categories" :key="c.category" class="ibars__row" data-tone="ink">
              <span class="ibars__label">{{ c.category }}</span>
              <span class="ibars__track"><span class="ibars__fill" :style="{ width: `${c.pct}%` }" /></span>
              <b class="ibars__value">{{ c.count }}</b>
            </li>
          </ul>
          <p v-else class="insights__foot">Las fichas de estas colaboraciones no tienen categorías.</p>
        </PanelCard>

        <PanelCard v-if="!isPlatform" title="Tu fiabilidad" description="Lo que dice tu historial en CIBERAN. Hoy solo lo ves tú y el equipo.">
          <dl class="ifacts" data-reliability>
            <div><dt>Colaboraciones completadas</dt><dd>{{ m.totals.completed }}</dd></div>
            <div><dt>Canceladas de común acuerdo</dt><dd>{{ m.totals.cancelled }}</dd></div>
            <div><dt>Terminadas por incumplimiento que declaró la otra parte</dt><dd>{{ m.terminatedAgainstMe }}</dd></div>
            <div><dt>Terminadas por incumplimiento que declaraste tú</dt><dd>{{ m.terminatedByMe }}</dd></div>
            <div><dt>{{ isCreator ? 'Entregas a tiempo' : 'Entregas recibidas a tiempo' }}</dt><dd>{{ formatPct(m.onTime.rate) }}</dd></div>
            <div><dt>Tu tiempo de respuesta</dt><dd>{{ formatHours(m.responseHours.mine) }}</dd></div>
          </dl>
          <p class="insights__foot">Una terminación por incumplimiento es lo que declara una parte: el equipo la revisa, pero aquí se cuenta tal cual.</p>
        </PanelCard>
      </div>

      <details class="insights__how">
        <summary>Cómo se calcula cada cifra</summary>
        <dl>
          <div v-for="n in METRIC_NOTES" :key="n.term"><dt>{{ n.term }}</dt><dd>{{ n.text }}</dd></div>
        </dl>
        <p>Cuando no hay datos suficientes se muestra «{{ NO_DATA }}» en lugar de una cifra.</p>
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import { weekDaysSummary, type WeekDay } from '~/utils/home-charts'

/**
 * Columnas con las entregas de los próximos 7 días, apiladas en pendientes y
 * publicadas. Sin librerías: cada altura sale de dos variables CSS que calcula
 * Vue; el aspecto, la entrada y el movimiento reducido son de CSS. El gráfico
 * es una imagen para los lectores de pantalla, con el detalle en su etiqueta.
 */
const props = defineProps<{ days: WeekDay[]; overdue?: number }>()

// Escala mínima de 3 para que un día con 1 entrega no ocupe toda la altura.
const max = computed(() => Math.max(3, ...props.days.map((d) => d.pending + d.done)))
const total = computed(() => props.days.reduce((sum, d) => sum + d.pending + d.done, 0))
const summary = computed(() => weekDaysSummary(props.days) + (props.overdue ? ` Además, ${props.overdue} fuera de plazo.` : ''))
</script>

<template>
  <figure class="week-chart">
    <div class="week-chart__plot" :class="!total && 'is-empty'" role="img" :aria-label="summary" :style="{ '--max': max }">
      <div
        v-for="(d, i) in days" :key="d.full" class="week-chart__col" :class="d.today && 'is-today'"
        :style="{ '--pending': d.pending, '--done': d.done, '--i': i }"
      >
        <span class="week-chart__value">{{ d.pending + d.done || '' }}</span>
        <div class="week-chart__track">
          <span class="week-chart__bar">
            <span class="week-chart__seg week-chart__seg--done" />
            <span class="week-chart__seg week-chart__seg--pending" />
          </span>
        </div>
        <span class="week-chart__label">{{ d.today ? 'hoy' : d.label }}</span>
      </div>
      <p v-if="!total" class="week-chart__none">Sin entregas en los próximos 7 días.{{ overdue ? ' Revisa las que están fuera de plazo.' : '' }}</p>
    </div>

    <figcaption class="week-chart__legend">
      <span class="week-chart__key"><i class="week-chart__swatch week-chart__swatch--pending" />Pendientes</span>
      <span class="week-chart__key"><i class="week-chart__swatch week-chart__swatch--done" />Publicadas</span>
      <span v-if="overdue" class="week-chart__late">{{ overdue }} {{ overdue === 1 ? 'entrega fuera de plazo' : 'entregas fuera de plazo' }}</span>
    </figcaption>
  </figure>
</template>

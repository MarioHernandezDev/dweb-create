<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'

/** Resumen de lo acordado (tarjeta oscura). Solo enseña las líneas de las que hay dato real. */
defineProps<{
  budgetCents: number | null
  deliverables: string | null
  usage: string | null
  acceptedOn: string | null
  finalDue: string | null
  payment: 'paid' | 'pending' | 'none'
  payLabel: string
}>()
const fmt = (d: string) => new Date(d.length > 10 ? d : `${d}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')
</script>

<template>
  <section class="csum" aria-label="Resumen">
    <h2 class="csum__title">Resumen</h2>
    <dl class="csum__lines">
      <div v-if="budgetCents"><dt>Tarifa acordada</dt><dd>{{ formatEuros(budgetCents) }}</dd></div>
      <div v-if="deliverables"><dt>Entregables</dt><dd>{{ deliverables }}</dd></div>
      <div v-if="usage"><dt>Uso del contenido</dt><dd>{{ usage }}</dd></div>
      <div v-if="acceptedOn"><dt>Aceptada el</dt><dd>{{ fmt(acceptedOn) }}</dd></div>
      <div v-if="finalDue"><dt>Entrega final</dt><dd>{{ fmt(finalDue) }}</dd></div>
      <div v-if="payment !== 'none'" class="csum__pay"><dt>Estado del {{ payLabel.toLowerCase() }}</dt><dd><span class="csum__badge" :data-pay="payment">{{ payment === 'paid' ? 'Pagado' : 'Pendiente' }}</span></dd></div>
    </dl>
  </section>
</template>

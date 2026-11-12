<script setup lang="ts">
import type { Kpi } from '~/utils/youtube-kpi'

/**
 * Totales secundarios del canal (visualizaciones totales, vídeos, media por
 * vídeo) en filas compactas bajo el indicador principal. Mismas reglas que las
 * tarjetas: un valor ausente es "—" con su motivo (nunca 0) y cada fila dice si
 * es dato de YouTube o cálculo de CIBERAN. Cada fila es un grupo con el valor
 * exacto en su etiqueta accesible.
 */
defineProps<{ kpis: Kpi[] }>()
</script>

<template>
  <dl class="flex flex-col divide-y divide-[var(--color-hairline)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)]">
    <div
      v-for="k in kpis" :key="k.key" role="group" class="flex items-center justify-between gap-3 px-4 py-3"
      :aria-label="k.value !== null ? `${k.label}: ${k.exact ?? k.value}` : `${k.label}: sin dato. ${k.reason ?? ''}`" data-total-row
    >
      <dt class="min-w-0">
        <span class="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
          <Icon :name="k.icon" class="size-4 shrink-0 text-[var(--color-platform-youtube)]" />
          <span class="truncate" :title="k.hint">{{ k.label }}</span>
        </span>
        <span class="block text-micro text-[var(--color-text-faint)]">{{ k.source === 'youtube' ? 'Dato de YouTube' : 'Cálculo de CIBERAN' }}</span>
      </dt>
      <dd class="shrink-0 text-right">
        <span v-if="k.value !== null" class="font-display text-[1.375rem] leading-none text-[var(--color-text)]" :title="k.exact ?? undefined" style="font-variant-numeric: proportional-nums">{{ k.value }}</span>
        <template v-else>
          <span class="font-display text-[1.375rem] leading-none text-[var(--color-text-faint)]">—</span>
          <span class="block max-w-[11rem] text-micro leading-snug text-[var(--color-text-muted)]">{{ k.reason }}</span>
        </template>
      </dd>
    </div>
  </dl>
</template>

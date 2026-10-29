<script setup lang="ts">
import type { Kpi } from '~/utils/youtube-kpi'
import type { KpiDelta } from '~/utils/youtube-period-view'

/**
 * Tarjeta de una métrica del canal. La protagonista (`hero`) es más grande. Si
 * no hay valor se muestra "—" y el MOTIVO (no un 0). Todas las tarjetas dicen
 * de dónde sale la cifra ("Dato de YouTube" o "Cálculo de FEEDMA") en la misma
 * línea, para que los valores queden alineados. `scope` es opcional: se usa
 * cuando el grupo no lo dice ya en su título (p. ej. "Últimos 28 días").
 * El detalle ("qué es esto") va en un `title`: accesible por teclado con el
 * foco en el icono de información.
 */
const props = defineProps<{ kpi: Kpi & { delta?: KpiDelta | null }; scope?: string }>()
const accent = 'var(--color-platform-youtube)'

const shownValue = useCountUp(() => props.kpi.count, () => props.kpi.value)

const provenance = computed(() => [props.scope, props.kpi.source === 'youtube' ? 'Dato de YouTube' : 'Cálculo de FEEDMA'].filter(Boolean).join(' · '))

const deltaColor = computed(() =>
  props.kpi.delta?.tone === 'good' ? 'var(--color-status-published)' : props.kpi.delta?.tone === 'bad' ? 'var(--color-status-alert)' : 'var(--color-text-faint)'
)
const deltaIcon = computed(() => (props.kpi.delta?.tone === 'good' ? 'ph:trend-up-bold' : props.kpi.delta?.tone === 'bad' ? 'ph:trend-down-bold' : 'ph:minus-bold'))

const ariaValue = computed(() => {
  const base = props.kpi.value !== null ? `${props.kpi.label}: ${props.kpi.exact ?? props.kpi.value}` : `${props.kpi.label}: sin dato. ${props.kpi.reason ?? ''}`
  return props.kpi.delta ? `${base}. ${props.kpi.delta.text} ${props.kpi.delta.label}` : base
})
</script>

<template>
  <div
    class="group relative flex flex-col justify-between rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
    :class="kpi.hero ? 'p-5 sm:p-6 min-h-[8.5rem]' : 'p-4 min-h-[6.5rem]'"
    role="group" :aria-label="ariaValue"
  >
    <span v-if="kpi.hero" class="absolute inset-y-0 left-0 w-1" :style="{ background: accent }" aria-hidden="true" />

    <div class="flex items-start justify-between gap-2">
      <p class="flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-text-muted)]">
        <Icon :name="kpi.icon" class="size-4 shrink-0" :style="{ color: accent }" />
        {{ kpi.label }}
      </p>
      <span
        class="shrink-0 flex items-center justify-center size-5 rounded-full text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-help focus-visible:outline-2"
        tabindex="0" role="img" :title="kpi.hint" :aria-label="kpi.hint"
      >
        <Icon name="ph:info" class="size-3.5" />
      </span>
    </div>

    <div class="mt-3">
      <p
        v-if="kpi.value !== null" :title="kpi.exact ?? undefined"
        class="font-display leading-none text-[var(--color-text)]"
        :class="kpi.hero ? 'text-[2.75rem] sm:text-[3.25rem]' : 'text-[1.75rem]'"
        style="font-variant-numeric: proportional-nums"
      >
        {{ shownValue }}
      </p>
      <template v-else>
        <p class="font-display leading-none text-[var(--color-text-faint)]" :class="kpi.hero ? 'text-[2.75rem]' : 'text-[1.75rem]'">—</p>
        <p class="mt-1.5 text-[0.75rem] text-[var(--color-text-muted)] leading-snug">{{ kpi.reason }}</p>
      </template>
      <p v-if="kpi.delta" class="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[0.75rem] font-medium" :style="{ color: deltaColor }">
        <Icon :name="deltaIcon" class="size-3.5 shrink-0" />
        {{ kpi.delta.text }}
        <span class="font-normal text-[var(--color-text-faint)]">{{ kpi.delta.label }}</span>
      </p>
      <p class="mt-2 text-[0.6875rem] uppercase tracking-wide text-[var(--color-text-faint)]">{{ provenance }}</p>
    </div>
  </div>
</template>

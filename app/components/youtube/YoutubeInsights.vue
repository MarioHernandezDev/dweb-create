<script setup lang="ts">
import type { Observation } from '~/utils/youtube-insights'

/**
 * Observaciones del periodo (A-R16g). Cada una sale de una regla fija sobre
 * datos reales de YouTube y enseña su CRITERIO: sin IA, sin causas y sin
 * recomendaciones. Si no hay datos para ninguna, lo dice en vez de inventar.
 */
defineProps<{ observations: Observation[]; loading: boolean }>()
</script>

<template>
  <section aria-labelledby="yt-insights" class="md:max-w-4xl">
    <h2 id="yt-insights" class="font-display text-[1.25rem] text-[var(--color-text)]">Observaciones</h2>
    <p class="mt-0.5 mb-3 text-[0.75rem] text-[var(--color-text-faint)]">
      Cálculos de FEEDMA con reglas fijas sobre tus datos de YouTube. Describen lo que pasó, no por qué.
    </p>

    <BaseCard radius="lg" padding="lg" :aria-busy="loading">
      <ul v-if="observations.length" class="flex flex-col divide-y divide-[var(--color-hairline)]" :class="loading && 'opacity-60 transition-opacity'">
        <li v-for="o in observations" :key="o.id" class="py-3 first:pt-0 last:pb-0" data-observation>
          <p class="text-[0.9375rem] text-[var(--color-text)]">{{ o.text }}</p>
          <p class="mt-1 text-[0.75rem] leading-relaxed text-[var(--color-text-faint)]">Criterio: {{ o.criterion }}</p>
        </li>
      </ul>
      <p v-else class="text-[0.875rem] text-[var(--color-text-muted)]">
        Aún no hay datos suficientes para ninguna observación en este periodo.
      </p>
    </BaseCard>
  </section>
</template>

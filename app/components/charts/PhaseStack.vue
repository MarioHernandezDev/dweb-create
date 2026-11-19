<script setup lang="ts">
import { statusMeta } from '~/utils/status'
import type { PhaseShare } from '~/utils/home-charts'

/**
 * Barra apilada con el reparto de publicaciones por fase y su leyenda con
 * recuentos. El color fuerte de cada fase lo decide el CSS por `data-status`.
 */
const props = withDefaults(defineProps<{ shares: PhaseShare[]; emptyText?: string }>(), {
  emptyText: 'Aún no hay publicaciones.'
})

const total = computed(() => props.shares.reduce((sum, s) => sum + s.count, 0))
const summary = computed(() =>
  total.value
    ? `Publicaciones por fase: ${props.shares.filter((s) => s.count).map((s) => `${statusMeta[s.status].label} ${s.count}`).join(', ')}.`
    : 'Todavía no hay publicaciones.'
)
</script>

<template>
  <div class="phase-stack">
    <div v-if="total" class="phase-stack__bar" role="img" :aria-label="summary">
      <span
        v-for="s in shares.filter((x) => x.count)" :key="s.status" class="phase-stack__seg"
        :data-status="s.status" :style="{ '--pct': s.pct }" :title="`${statusMeta[s.status].label}: ${s.count}`"
      />
    </div>
    <p v-else class="phase-stack__empty">{{ emptyText }}</p>

    <ul class="phase-stack__legend">
      <li v-for="s in shares" :key="s.status" class="phase-stack__item" :class="!s.count && 'is-empty'">
        <i class="phase-stack__swatch" :data-status="s.status" />
        <span class="phase-stack__name">{{ statusMeta[s.status].label }}</span>
        <span class="phase-stack__count">{{ s.count }}</span>
      </li>
    </ul>
  </div>
</template>

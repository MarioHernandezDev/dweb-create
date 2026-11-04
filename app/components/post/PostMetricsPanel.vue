<script setup lang="ts">
import { ENGAGEMENT_NOTE, metricsSummary } from '~/utils/post-metrics-view'
import { platformMeta } from '~/utils/mock-data'
import type { Platform } from '~/types'

/**
 * Métricas de la publicación vinculada (A-R8b). Cada cifra dice de dónde sale:
 * dato de la red (visualizaciones, me gusta…) o cálculo de CIBERAN (interacción,
 * variación). Un dato ausente es "—" con su motivo, nunca 0. "Actualizar"
 * lee la red ahora y guarda la medición del día.
 */
const props = defineProps<{ postId: string; platform: Platform }>()

const label = computed(() => platformMeta[props.platform].label)
const { rows, loading, loaded, refreshing, error, contentMissing, load, refresh } = usePostMetrics(toRef(props, 'postId'))
const summary = computed(() => metricsSummary(rows.value, props.platform))

onMounted(load)

const dayText = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
</script>

<template>
  <div class="flex flex-col gap-2.5" data-metrics-panel>
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-semibold text-[var(--text-muted)]">Métricas</p>
      <BaseButton variant="ghost" size="sm" icon="ph:arrows-clockwise-bold" :icon-spin="refreshing" :disabled="refreshing" data-refresh-metrics @click="refresh">
        {{ refreshing ? 'Leyendo…' : 'Actualizar' }}
      </BaseButton>
    </div>

    <SkeletonBlock v-if="loading && !loaded" height="5rem" rounded="var(--radius-sm)" />

    <template v-else-if="summary">
      <dl class="grid grid-cols-2 gap-2" style="font-variant-numeric: tabular-nums">
        <div v-for="m in summary.items" :key="m.key" class="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] p-2.5" :title="m.reason ?? m.label" data-metric>
          <dt class="flex items-center gap-1.5 text-micro text-[var(--color-text-muted)]"><Icon :name="m.icon" class="size-3.5" /> {{ m.label }}</dt>
          <dd class="mt-0.5 font-display text-[1.375rem] leading-none" :class="m.value === null ? 'text-[var(--color-text-faint)]' : 'text-[var(--color-text)]'">{{ m.text }}</dd>
          <p v-if="m.reason" class="mt-1 text-micro leading-snug text-[var(--color-text-faint)]">{{ m.reason }}</p>
          <p v-else-if="m.delta && summary.previousOn" class="mt-1 text-micro text-[var(--color-text-faint)]" data-metric-delta>{{ m.delta.text }} desde el {{ dayText(summary.previousOn) }}</p>
        </div>
      </dl>
      <p v-if="summary.engagement !== null" class="text-sm text-[var(--color-text)]" :title="ENGAGEMENT_NOTE" data-engagement>
        Interacción {{ new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(summary.engagement) }} % <span class="text-[var(--color-text-faint)]">· cálculo de CIBERAN</span>
      </p>
      <p class="text-micro text-[var(--color-text-faint)]">Medido el {{ dayText(summary.measuredOn) }} · dato de {{ label }}{{ summary.previousOn ? ' · la variación es un cálculo de CIBERAN' : '' }}</p>
    </template>

    <p v-else-if="!error" class="text-sm text-[var(--color-text-muted)]" data-metrics-empty>
      Todavía no hay métricas guardadas. Pulsa «Actualizar» para leerlas de {{ label }} ahora; los datos pueden tardar hasta 48 h en estar disponibles.
    </p>

    <p v-if="contentMissing" class="text-sm text-[var(--color-status-alert)]" role="alert" data-content-missing>
      {{ label }} ya no devuelve este contenido (¿borrado o privado?). Las métricas guardadas hasta ahora se conservan; puedes desvincularlo.
    </p>
    <p v-if="error" class="text-sm text-[var(--color-status-alert)]" role="alert" data-metrics-error>
      {{ error.message }}
      <NuxtLink v-if="error.code === 'reconnect_required'" to="/creator/metrics#conexiones" class="font-medium underline underline-offset-2">Reconectar</NuxtLink>
    </p>
  </div>
</template>

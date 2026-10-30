<script setup lang="ts">
import type { PostStatus } from '~/types'
import { formatCompactNumber, platformMeta } from '~/utils/mock-data'
import type { Platform } from '~/types'

/**
 * Informe de rendimiento de una colaboración (A-R15), para el partner.
 * Cada entrega aparece tal como está: sin vincular, vinculada sin medir o
 * medida. Un dato ausente es "—" con su motivo, nunca 0; los totales solo
 * suman las entregas que aportan ese dato y lo dicen. Las cifras de la red
 * se rotulan como tales y las sumas como cálculo de FEEDMA.
 */
const props = defineProps<{ collaborationId: string }>()

const { report, loading, loaded, error, load } = useCollaborationReport(toRef(props, 'collaborationId'))
onMounted(load)
watch(() => props.collaborationId, load)

const label = (p: string) => platformMeta[p as Platform]?.label ?? p
const dayText = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
</script>

<template>
  <div class="flex flex-col gap-4" data-collab-report>
    <SkeletonBlock v-if="loading && !loaded" height="8rem" rounded="var(--radius-md)" />

    <p v-else-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)]" role="alert" data-report-error>{{ error }}</p>

    <EmptyState
      v-else-if="loaded && !report.deliverables"
      icon="ph:chart-line-up" title="Aún no hay entregas"
      description="Cuando el creador cree entregas para esta colaboración, aquí verás cómo rinden."
    />

    <template v-else-if="loaded">
      <p class="text-[0.8125rem] text-[var(--color-text-muted)]" data-report-summary>
        {{ report.deliverables }} entrega{{ report.deliverables === 1 ? '' : 's' }} ·
        {{ report.linked }} vinculada{{ report.linked === 1 ? '' : 's' }} a su contenido publicado ·
        {{ report.measured }} con métricas
      </p>

      <dl v-if="report.measured" class="grid grid-cols-3 gap-2" style="font-variant-numeric: tabular-nums">
        <div v-for="t in report.totals" :key="t.key" class="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] p-2.5" data-report-total>
          <dt class="text-[0.75rem] text-[var(--color-text-muted)]">{{ t.label }}</dt>
          <dd class="mt-0.5 font-display text-[1.25rem] leading-none" :class="t.value === null ? 'text-[var(--color-text-faint)]' : 'text-[var(--color-text)]'">
            {{ t.value === null ? '—' : formatCompactNumber(t.value) }}
          </dd>
          <p class="mt-1 text-[0.6875rem] leading-snug text-[var(--color-text-faint)]">
            {{ t.value === null ? 'Ninguna entrega aporta este dato' : `Suma de ${t.counted} entrega${t.counted === 1 ? '' : 's'} con dato` }}
          </p>
        </div>
      </dl>
      <p v-if="report.measured" class="text-[0.6875rem] text-[var(--color-text-faint)]">Los totales son un cálculo de FEEDMA sumando las últimas mediciones guardadas; cada cifra individual es dato de la red.</p>

      <ul class="flex flex-col gap-2.5">
        <li v-for="e in report.entries" :key="e.post.id" class="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] p-3" data-report-entry :data-state="e.state">
          <div class="flex items-center justify-between gap-2">
            <p class="min-w-0 truncate text-[0.875rem] font-medium text-[var(--color-text)]">{{ e.post.title }}</p>
            <StatusPill :status="(e.post.status as PostStatus)" compact />
          </div>
          <p class="mt-0.5 text-[0.75rem] text-[var(--color-text-faint)]">
            {{ label(e.post.platform) }} · fecha {{ dayText(e.post.dueDate) }}
            <template v-if="e.linkUrl"> · <a :href="e.linkUrl" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-[var(--color-text)]">Ver contenido</a></template>
          </p>

          <p v-if="e.state === 'unlinked'" class="mt-2 text-[0.8125rem] text-[var(--color-text-muted)]">
            El creador aún no ha vinculado esta entrega con su contenido publicado.
          </p>
          <p v-else-if="e.state === 'unmeasured'" class="mt-2 text-[0.8125rem] text-[var(--color-text-muted)]">
            Vinculada, pero todavía sin métricas guardadas.
          </p>
          <template v-else-if="e.summary">
            <dl class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6" style="font-variant-numeric: tabular-nums">
              <div v-for="m in e.summary.items" :key="m.key" :title="m.reason ?? m.label" data-report-metric>
                <dt class="text-[0.6875rem] text-[var(--color-text-muted)]">{{ m.label }}</dt>
                <dd class="font-display text-[1.0625rem]" :class="m.value === null ? 'text-[var(--color-text-faint)]' : 'text-[var(--color-text)]'">{{ m.text }}</dd>
                <p v-if="m.reason" class="text-[0.625rem] leading-snug text-[var(--color-text-faint)]">{{ m.reason }}</p>
              </div>
            </dl>
            <p class="mt-1.5 text-[0.6875rem] text-[var(--color-text-faint)]">Medido el {{ dayText(e.summary.measuredOn) }} · dato de {{ label(e.post.platform) }}</p>
          </template>
        </li>
      </ul>
    </template>
  </div>
</template>

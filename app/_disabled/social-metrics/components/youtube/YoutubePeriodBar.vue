<script setup lang="ts">
import { PERIOD_DAYS } from '~/utils/youtube-period-view'
import type { AvailablePeriodDto } from '~/utils/youtube-period-view'

/**
 * Selector de periodo (7 / 28 / 90 / 365 días) y conmutador de comparación.
 * Un periodo solo se puede elegir si el canal ya existía durante todo él: los
 * demás salen deshabilitados y dicen por qué. La comparación se desactiva si el
 * periodo anterior no es completo (no se compara con medio periodo).
 */
const props = defineProps<{
  modelValue: number
  compare: boolean
  /** `null` hasta la primera respuesta: entonces todos están disponibles. */
  periods: AvailablePeriodDto[] | null
  comparable: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [days: number]; 'update:compare': [value: boolean] }>()

const options = computed(() =>
  PERIOD_DAYS.map((days) => {
    const info = props.periods?.find((p) => p.days === days)
    const available = info ? info.available : true
    return {
      days,
      available,
      title: available ? `Últimos ${days} días` : `El canal no existía durante todos los últimos ${days} días`
    }
  })
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
    <div class="inline-flex items-center gap-1 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] p-1" role="group" aria-label="Periodo">
      <button
        v-for="o in options" :key="o.days" type="button"
        class="h-8 px-3 rounded-[calc(var(--radius-xs)-4px)] text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :class="modelValue === o.days ? 'bg-[var(--color-ink-raised)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
        :disabled="!o.available" :title="o.title" :aria-pressed="modelValue === o.days" :aria-label="o.title"
        @click="emit('update:modelValue', o.days)"
      >
        {{ o.days }} días
      </button>
    </div>

    <label
      class="inline-flex items-center gap-2 text-sm"
      :class="comparable ? 'text-[var(--color-text)] cursor-pointer' : 'text-[var(--color-text-faint)] cursor-not-allowed'"
      :title="comparable ? undefined : 'No se puede comparar: el canal no existía durante todo el periodo anterior'"
    >
      <input
        type="checkbox" class="size-4 accent-[var(--color-primary-500)]"
        :checked="compare && comparable" :disabled="!comparable"
        @change="emit('update:compare', ($event.target as HTMLInputElement).checked)"
      >
      Comparar con el periodo anterior
    </label>

    <Icon v-if="loading" name="ph:circle-notch-bold" class="size-4 animate-spin text-[var(--color-text-faint)]" aria-label="Cargando" />
  </div>
</template>

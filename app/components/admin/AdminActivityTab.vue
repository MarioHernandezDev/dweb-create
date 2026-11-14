<script setup lang="ts">
import { ACTIVITY_ICONS, ACTIVITY_TYPE_LABELS, formatDateTime } from '~/utils/admin-labels'
import { relativeTime } from '~/utils/status'

interface ActivityItem { type: string; summary: string; createdAt: string; profileId: string | null; refId: string | null }

const { filters, page, pageSize, items, total, loading, error, load, setPage } = useAdminList<ActivityItem>({
  endpoint: '/api/admin/activity', prefix: 'a_', dataKey: 'events', pageSize: 30,
  defaults: { q: '', types: '', from: '', to: '', profile: '' }
})
onMounted(load)

/** Tipos elegidos, guardados como lista separada por comas en la URL. */
const selectedTypes = computed(() => (filters.types ? filters.types.split(',').filter(Boolean) : []))
function toggleType(t: string) {
  const set = new Set(selectedTypes.value)
  if (set.has(t)) set.delete(t)
  else set.add(t)
  filters.types = [...set].join(',')
}

function exportCsv() {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v)
  window.location.assign(`/api/admin/activity-export?${params.toString()}`)
}
</script>

<template>
  <div class="flex flex-col gap-3" data-admin-activity>
    <div class="grid gap-2.5 sm:grid-cols-[1fr_auto_auto_auto] items-end">
      <div class="relative">
        <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-faint)]" />
        <label class="sr-only" for="a-q">Buscar en la actividad</label>
        <input id="a-q" v-model="filters.q" type="search" class="input w-full pl-9" placeholder="Buscar nombre, empresa, acción…">
      </div>
      <label class="grid gap-1 text-micro text-[var(--color-text-faint)]">Desde<input v-model="filters.from" type="date" class="input"></label>
      <label class="grid gap-1 text-micro text-[var(--color-text-faint)]">Hasta<input v-model="filters.to" type="date" class="input"></label>
      <BaseButton variant="outline" size="sm" icon="ph:download-simple-bold" data-admin-export @click="exportCsv">Exportar CSV</BaseButton>
    </div>

    <div class="flex flex-wrap gap-1.5" role="group" aria-label="Tipos de evento">
      <Chip v-for="(label, t) in ACTIVITY_TYPE_LABELS" :key="t" :selected="selectedTypes.includes(t)" size="sm" @click="toggleType(t)">{{ label }}</Chip>
    </div>
    <div v-if="filters.profile" class="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
      <span>Solo la actividad de una cuenta</span>
      <BaseButton variant="ghost" size="sm" icon="ph:x-bold" @click="filters.profile = ''">Quitar</BaseButton>
    </div>

    <p v-if="error" class="text-sm text-[var(--color-status-alert)]" role="alert">{{ error }}</p>
    <EmptyState v-if="!loading && !items.length && !error" icon="ph:pulse" title="Sin actividad con esos filtros" />
    <BaseCard v-for="(item, i) in items" :key="`${item.type}-${item.refId}-${i}`" radius="lg" padding="md" class="flex items-center gap-3" data-admin-activity-row>
      <span class="flex items-center justify-center size-9 rounded-full bg-[var(--color-primary-500)]/12 text-[var(--color-primary-500)] shrink-0">
        <Icon :name="ACTIVITY_ICONS[item.type] ?? 'ph:bell-fill'" class="size-4" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-[var(--color-text)]">{{ item.summary }}</p>
        <p class="text-micro text-[var(--color-text-faint)]" :title="formatDateTime(item.createdAt)">{{ ACTIVITY_TYPE_LABELS[item.type] ?? item.type }} · {{ relativeTime(item.createdAt) }}</p>
      </div>
      <BaseButton v-if="item.profileId" :to="`/admin/users/${item.profileId}`" variant="ghost" size="sm" icon="ph:identification-card-bold" aria-label="Ver ficha de la cuenta" />
    </BaseCard>

    <AdminPagination :page="page" :page-size="pageSize" :total="total" :loading="loading" @update:page="setPage" />
  </div>
</template>

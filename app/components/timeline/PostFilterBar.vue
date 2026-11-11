<script setup lang="ts">
import { platformMeta, formatEuros } from '~/utils/mock-data'
import { collaborationStatusMeta, statusMeta } from '~/utils/status'
import { OWN_PROJECT, POST_SORT_OPTIONS, type PostFilters, type PostSort } from '~/utils/post-library'
import type { Platform, PostStatus } from '~/types'

/**
 * Barra de búsqueda y filtros compartida por el Tablero y la Lista de
 * publicaciones (A-R21): mismos controles, mismo estado (`filters`), así que
 * pasar de una vista a otra no pierde lo filtrado. El estado solo se ofrece en
 * la Lista (en el Tablero las columnas ya son los estados) y el orden también.
 */
const filters = defineModel<PostFilters>('filters', { required: true })
const sort = defineModel<PostSort>('sort')

defineProps<{
  collabs: { id: string; partnerName: string; budgetCents: number | null; status: keyof typeof collaborationStatusMeta }[]
  showStatus?: boolean
  showSort?: boolean
}>()

const platformOptions = Object.entries(platformMeta).map(([value, meta]) => ({ value: value as Platform, label: meta.label }))
const statusOptions = (['idea', 'in_production', 'ready_for_review', 'scheduled', 'published'] as PostStatus[]).map((s) => ({ value: s, label: statusMeta[s].label }))

function patch(p: Partial<PostFilters>) {
  filters.value = { ...filters.value, ...p }
}

const select = 'h-9 px-3 max-w-full min-w-0 truncate rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5" role="search" data-filter-bar>
    <div class="relative flex-1 min-w-[11rem] max-w-xs">
      <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-text-faint)]" />
      <label class="sr-only" for="post-filter-search">Buscar publicaciones por título</label>
      <input
        id="post-filter-search" :value="filters.search" type="search" placeholder="Buscar por título…"
        class="input w-full h-9 pl-8 pr-3"
        @input="patch({ search: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <label v-if="showStatus" class="sr-only" for="post-filter-status">Estado</label>
    <select v-if="showStatus" id="post-filter-status" :class="select" :value="filters.status" @change="patch({ status: ($event.target as HTMLSelectElement).value as PostStatus | '' })">
      <option value="">Todos los estados</option>
      <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
    </select>

    <label class="sr-only" for="post-filter-platform">Red</label>
    <select id="post-filter-platform" :class="select" :value="filters.platform" @change="patch({ platform: ($event.target as HTMLSelectElement).value as Platform | '' })">
      <option value="">Todas las redes</option>
      <option v-for="p in platformOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
    </select>

    <label class="sr-only" for="post-filter-project">Proyecto</label>
    <select id="post-filter-project" :class="select" :value="filters.project" @change="patch({ project: ($event.target as HTMLSelectElement).value })">
      <option value="">Todos los proyectos</option>
      <option :value="OWN_PROJECT">Contenido propio</option>
      <option v-for="c in collabs" :key="c.id" :value="c.id">
        {{ c.partnerName }} · {{ c.budgetCents ? formatEuros(c.budgetCents) : 'Sin presupuesto' }} · {{ collaborationStatusMeta[c.status].label }}
      </option>
    </select>

    <template v-if="showSort && sort">
      <label class="sr-only" for="post-filter-sort">Ordenar por</label>
      <select id="post-filter-sort" :class="select" :value="sort" @change="sort = ($event.target as HTMLSelectElement).value as PostSort">
        <option v-for="o in POST_SORT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </template>

    <div class="ml-auto flex items-center gap-3"><slot name="end" /></div>
  </div>
</template>

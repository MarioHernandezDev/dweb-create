<script setup lang="ts">
import { contentTypeMeta, statusMeta, isPostOverdue, overdueLabel, relativeTime } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'
import { hasActiveFilters, sortPosts, filterPosts, type PostFilters, type PostSort } from '~/utils/post-library'
import type { Post, PostStatus } from '~/types'

/**
 * Lista de publicaciones (A-R21): la misma fuente y los mismos filtros que el
 * Tablero, en filas compactas con orden. Cada fila abre la página de detalle
 * (con `?desde=lista` para volver aquí) y permite cambiar de fase o borrar
 * sin salir. El resto de la gestión vive en esa página.
 */
const filters = defineModel<PostFilters>('filters', { required: true })
const sort = defineModel<PostSort>('sort', { required: true })
const props = defineProps<{ posts: Post[]; projectNameOf: (p: Post) => string | null }>()
const emit = defineEmits<{ move: [post: Post, status: PostStatus]; remove: [post: Post]; clear: []; create: [] }>()

const phases: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']
const shown = computed(() => sortPosts(filterPosts(props.posts, filters.value), sort.value))
const filtered = computed(() => hasActiveFilters(filters.value))

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <div data-post-list>
    <EmptyState
      v-if="!posts.length"
      icon="ph:kanban-bold" title="Aún no tienes publicaciones"
      description="Crea la primera: puede ser contenido propio o el entregable de una colaboración."
    >
      <BaseButton variant="primary" size="sm" icon="ph:plus-bold" @click="emit('create')">Nueva publicación</BaseButton>
    </EmptyState>
    <EmptyState
      v-else-if="!shown.length"
      icon="ph:funnel" title="Ningún resultado con estos filtros"
      description="Prueba a quitar el buscador o alguno de los filtros."
    >
      <BaseButton variant="secondary" size="sm" icon="ph:x-bold" @click="emit('clear')">Quitar filtros</BaseButton>
    </EmptyState>

    <template v-else>
      <p class="mb-3 text-[0.8125rem] text-[var(--color-text-muted)]" data-list-count>
        {{ shown.length }} publicación{{ shown.length === 1 ? '' : 'es' }}<template v-if="filtered"> de {{ posts.length }}</template>
      </p>
      <ul class="flex flex-col gap-2">
        <li
          v-for="p in shown" :key="p.id" data-list-row
          class="group flex items-center gap-3 md:gap-4 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3 transition-colors hover:border-[var(--color-hairline-strong)]"
        >
          <NuxtLink :to="`/creator/post/${p.id}?desde=lista`" class="flex min-w-0 flex-1 items-center gap-3 md:gap-4 rounded-[var(--radius-xs)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary-500)]" :aria-label="`Abrir «${p.title}»`">
            <span class="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] flex items-center justify-center">
              <img v-if="p.mediaUrl" :src="p.mediaUrl" alt="" class="absolute inset-0 size-full object-cover">
              <Icon v-else :name="contentTypeMeta[p.contentType].icon" class="size-5 text-[var(--color-text)] opacity-25" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[0.9375rem] font-medium text-[var(--color-text)]">{{ p.title }}</span>
              <span class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.75rem] text-[var(--color-text-faint)]">
                <span class="inline-flex items-center gap-1"><Icon :name="platformMeta[p.platform].icon" class="size-3.5" :style="{ color: platformMeta[p.platform].colorVar }" /> {{ platformMeta[p.platform].label }}</span>
                <span :class="isPostOverdue(p) && 'font-medium text-[var(--color-status-alert)]'">Entrega {{ day(p.dueDate) }}<template v-if="isPostOverdue(p)"> · {{ overdueLabel(p.dueInDays) }}</template></span>
                <span v-if="p.updatedAt" class="hidden md:inline">Modificada {{ relativeTime(p.updatedAt) }}</span>
                <span v-if="projectNameOf(p)" class="inline-flex items-center gap-1 text-[var(--color-primary-500)]" data-row-project><Icon name="ph:handshake-fill" class="size-3" /> {{ projectNameOf(p) }}</span>
                <span v-else>Contenido propio</span>
              </span>
            </span>
          </NuxtLink>

          <label class="sr-only" :for="`row-status-${p.id}`">Cambiar de fase</label>
          <select
            :id="`row-status-${p.id}`" class="h-9 shrink-0 max-w-[9.5rem] rounded-full border border-[var(--color-hairline)] bg-transparent px-3 text-[0.8125rem] font-semibold"
            :style="{ color: statusMeta[p.status].color }" :value="p.status"
            @change="emit('move', p, ($event.target as HTMLSelectElement).value as PostStatus)"
          >
            <option v-for="s in phases" :key="s" :value="s" class="bg-[var(--color-ink-raised)] text-[var(--color-text)]">{{ statusMeta[s].label }}</option>
          </select>
          <button
            type="button" class="shrink-0 size-9 flex items-center justify-center rounded-full text-[var(--color-text-faint)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-status-alert)] transition-colors"
            :aria-label="`Borrar «${p.title}»`" data-row-delete @click="emit('remove', p)"
          >
            <Icon name="ph:trash-fill" class="size-4" />
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

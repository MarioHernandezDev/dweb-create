<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Post, PostStatus, Platform } from '~/types'
import { statusMeta } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'

defineEmits<{ open: [post: Post] }>()

const { posts, updatePost, deletePost, refresh } = useMyPosts()
const { requests: collabRequests, ensureLoaded: ensureCollabRequestsLoaded } = useCollabRequests()
onMounted(() => ensureCollabRequestsLoaded())

// Fases del tablero, en el orden en que se recorren de verdad — "overdue" no
// es una fase a la que se arrastre nada, es una fecha pasada (ver aviso en
// cada card), así que se queda fuera de las columnas.
const phases: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']

// Filtros — antes no había ninguna forma de ver solo, por ejemplo, los
// posts de una colaboración concreta con volumen real de publicaciones.
const search = ref('')
const platformFilter = ref<Platform | ''>('')
const collaborationFilter = ref<string | ''>('')
const platformOptions = Object.entries(platformMeta).map(([value, meta]) => ({ value: value as Platform, label: meta.label }))
const hasFilters = computed(() => !!(search.value || platformFilter.value || collaborationFilter.value))

const filteredPosts = computed(() =>
  posts.value.filter((p) => {
    if (search.value && !p.title.toLowerCase().includes(search.value.toLowerCase())) return false
    if (platformFilter.value && p.platform !== platformFilter.value) return false
    if (collaborationFilter.value && p.collaborationId !== collaborationFilter.value) return false
    return true
  })
)

// Las columnas viven en su propio estado local, mutado directamente por
// vuedraggable al arrastrar — si se derivaran de `posts` con un `computed`,
// cada arrastre se deshacía solo en el siguiente tick (el computed no sabe
// que ese movimiento ya es "la verdad", lo trataría como algo que revertir).
const board = reactive<Record<PostStatus, Post[]>>(
  Object.fromEntries(phases.map((phase) => [phase, []])) as Record<PostStatus, Post[]>
)

// Reparte `filteredPosts` en las columnas sin tocar el orden de arrastre ya
// hecho: solo añade lo que falta y quita lo que ya no está (post nuevo
// creado con el Fab, post borrado, o que un filtro lo deja fuera ahora).
function sync() {
  const known = new Set(phases.flatMap((phase) => board[phase].map((p) => p.id)))
  for (const post of filteredPosts.value) {
    if (!known.has(post.id) && phases.includes(post.status)) board[post.status].push(post)
  }
  const stillThere = new Set(filteredPosts.value.map((p) => p.id))
  for (const phase of phases) {
    board[phase] = board[phase].filter((p) => stillThere.has(p.id))
  }
}

watch(filteredPosts, sync, { immediate: true })

function isOverdue(post: Post) {
  return post.dueInDays < 0 && post.status !== 'published'
}

// Compartida por el arrastre y el selector rápido de fase (#actions) — en
// móvil, arrastrar una card de la primera a la última columna obliga a
// hacer scroll lateral con la otra mano mientras la sostienes, así que el
// selector existe como atajo sin arrastrar nada.
async function moveTo(post: Post, phase: PostStatus, fromDrag = false) {
  if (post.status === phase) return
  try {
    await updatePost(post.id, { status: phase })
  } catch (err) {
    console.error('[PhaseBoard] fallo al mover de fase, recargando el tablero:', err)
    if (fromDrag) {
      // vuedraggable ya la había movido de columna de verdad: se saca de ahí
      // (no basta con corregir el status, `sync()` solo añade ids que no
      // reconoce, no reubica uno que ya está en la columna equivocada) y
      // que `sync()` la vuelva a colocar donde diga el servidor.
      const idx = board[phase].findIndex((p) => p.id === post.id)
      if (idx !== -1) board[phase].splice(idx, 1)
    }
    await refresh()
  }
}

function onChange(phase: PostStatus, event: { added?: { element: Post } }) {
  const moved = event.added?.element
  if (moved) moveTo(moved, phase, true)
}

// Selección múltiple para borrar varios a la vez — pensada para limpiar
// "publicados" antiguos de golpe en vez de uno a uno. Arrastrar se
// desactiva mientras se selecciona (no tendría sentido hacer las dos cosas
// a la vez con el dedo/ratón).
const selectionMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}
function cancelSelection() {
  selectionMode.value = false
  selectedIds.value = new Set()
}

const { confirm } = useConfirm()
const bulkDeleting = ref(false)
async function bulkDelete() {
  const n = selectedIds.value.size
  const ok = await confirm({
    title: `¿Borrar ${n} publicación${n > 1 ? 'es' : ''}?`,
    message: 'Se borrarán permanentemente, junto con sus predicciones de éxito si las tenían.',
    confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
  })
  if (!ok) return
  bulkDeleting.value = true
  try {
    await Promise.all([...selectedIds.value].map((id) => deletePost(id)))
    cancelSelection()
  } finally {
    bulkDeleting.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="posts.length" class="flex flex-wrap items-center gap-2.5 mb-5">
      <div class="relative flex-1 min-w-[11rem] max-w-xs">
        <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-text-faint)]" />
        <input
          v-model="search" type="text" placeholder="Buscar por título…"
          class="w-full h-9 pl-8 pr-3 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
        >
      </div>
      <select v-model="platformFilter" class="h-9 px-3 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)]">
        <option value="">Todas las redes</option>
        <option v-for="p in platformOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
      <select v-if="collabRequests.length" v-model="collaborationFilter" class="h-9 px-3 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)]">
        <option value="">Todas las colaboraciones</option>
        <option v-for="c in collabRequests" :key="c.id" :value="c.id">{{ c.partnerName }}</option>
      </select>

      <button
        type="button" class="ml-auto text-[0.8125rem] font-medium transition-colors"
        :class="selectionMode ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
        @click="selectionMode ? cancelSelection() : (selectionMode = true)"
      >
        {{ selectionMode ? 'Cancelar' : 'Seleccionar' }}
      </button>
    </div>

    <EmptyState
      v-if="!posts.length"
      icon="ph:kanban-bold" title="No hay entregas por aquí"
      description="Crea tu primera publicación con el botón de abajo y empieza a moverla por el tablero."
    />
    <EmptyState
      v-else-if="hasFilters && !filteredPosts.length"
      icon="ph:funnel" title="Ningún resultado con estos filtros"
      description="Prueba a quitar el buscador o alguno de los filtros de arriba."
    />
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-4 lg:items-start">
      <section v-for="phase in phases" :key="phase" class="flex flex-col min-w-0 lg:max-w-[20rem]">
        <div class="flex items-center gap-2 mb-3 px-0.5">
          <span class="size-2 rounded-full shrink-0" :style="{ background: statusMeta[phase].color }" />
          <h2 class="text-[0.8125rem] font-medium text-[var(--color-text)]">{{ statusMeta[phase].label }}</h2>
          <span class="text-[0.75rem] text-[var(--color-text-faint)] ml-auto">{{ board[phase].length }}</span>
        </div>

        <draggable
          v-model="board[phase]"
          item-key="id"
          group="phase-board-posts"
          :disabled="selectionMode"
          :animation="150"
          :delay="150"
          :delay-on-touch-only="true"
          :scroll="true"
          :scroll-sensitivity="120"
          :scroll-speed="16"
          :bubble-scroll="true"
          :force-fallback="true"
          ghost-class="nx-phase-ghost"
          class="flex flex-col gap-2.5 min-h-[3.5rem] max-h-[calc(100vh-18rem)] overflow-y-auto nx-scroll rounded-[var(--radius-md)] p-1.5 -m-1.5"
          @change="(e: { added?: { element: Post } }) => onChange(phase, e)"
        >
          <template #item="{ element }: { element: Post }">
            <div class="relative" :class="isOverdue(element) && 'rounded-[var(--radius-md)] ring-2 ring-[var(--color-status-alert)]'">
              <BoardCard :post="element" :phases="phases" @open="$emit('open', $event)" @move="moveTo(element, $event)" />
              <template v-if="selectionMode">
                <button
                  type="button" class="absolute inset-0 z-10 rounded-[var(--radius-md)]"
                  :aria-label="selectedIds.has(element.id) ? 'Quitar de la selección' : 'Seleccionar'"
                  @click.stop="toggleSelect(element.id)"
                />
                <span
                  class="absolute top-2 right-2 z-20 size-5 rounded-full border-2 flex items-center justify-center pointer-events-none"
                  :class="selectedIds.has(element.id) ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)]' : 'bg-[var(--color-ink-raised)] border-[var(--color-hairline-strong)]'"
                >
                  <Icon v-if="selectedIds.has(element.id)" name="ph:check-bold" class="size-3 text-white" />
                </span>
              </template>
            </div>
          </template>

          <template v-if="!board[phase].length" #footer>
            <div class="flex items-center justify-center h-14 rounded-[var(--radius-md)] border border-dashed border-[var(--color-hairline-strong)] text-[0.75rem] text-[var(--color-text-faint)]">
              Suelta aquí
            </div>
          </template>
        </draggable>
      </section>
    </div>

    <Transition
      enter-active-class="transition-[opacity,transform] duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="selectionMode && selectedIds.size"
        class="fixed z-30 bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-3 h-12 pl-4 pr-2 rounded-full bg-[var(--color-ink-raised)] border border-[var(--color-hairline-strong)] shadow-[var(--shadow-float)]"
      >
        <span class="text-[0.8125rem] font-medium text-[var(--color-text)]">{{ selectedIds.size }} seleccionada{{ selectedIds.size > 1 ? 's' : '' }}</span>
        <BaseButton variant="danger" size="sm" :icon-spin="bulkDeleting" :disabled="bulkDeleting" @click="bulkDelete">Borrar</BaseButton>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nx-phase-ghost {
  opacity: 0.4;
}
</style>

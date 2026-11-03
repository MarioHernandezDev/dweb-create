<script setup lang="ts">
import draggable from 'vuedraggable'
import type { ComponentPublicInstance } from 'vue'
import type { Post, PostStatus, Platform } from '~/types'
import { statusMeta, isPostOverdue, phaseDescription } from '~/utils/status'
import { emptyFilters, filterPosts, hasActiveFilters, type PostFilters } from '~/utils/post-library'

const { posts, deletePost, refresh } = useMyPosts()
const { changeStatus } = usePostActions()
const { requests: collabRequests, ensureLoaded: ensureCollabRequestsLoaded } = useCollabRequests()
const { ensureLabels } = useLabels()
const { creator, ensureCreator, setWipLimit } = useMyCreator()
const { confirm } = useConfirm()
const toast = useToast()
onMounted(() => {
  ensureCollabRequestsLoaded()
  ensureLabels()
  ensureCreator()
})

// Fases del tablero, en el orden en que se recorren de verdad — "overdue" no
// es una fase a la que se arrastre nada, es una fecha pasada (ver aviso en
// cada card), así que se queda fuera de las columnas.
const phases: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']

// Filtros compartidos con la Lista (los posee la página, ver timeline.vue y
// utils/post-library.ts): cambiar de vista no pierde lo filtrado.
const filters = defineModel<PostFilters>('filters', { required: true })
const hasFilters = computed(() => hasActiveFilters(filters.value, { ignoreStatus: true }))

function clearFilters() {
  filters.value = emptyFilters()
}

// El Tablero no filtra por estado: las columnas ya son los estados.
const filteredPosts = computed(() => filterPosts(posts.value, filters.value, { ignoreStatus: true }))

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

const isOverdue = isPostOverdue

// Proyecto de una card = el partner de su colaboración (null si es contenido propio).
function projectNameOf(post: Post): string | null {
  if (!post.collaborationId) return null
  return collabRequests.value.find((c) => c.id === post.collaborationId)?.partnerName ?? 'Colaboración'
}

// Compartida por el arrastre y el selector rápido de fase (#actions) — en
// móvil, arrastrar una card de la primera a la última columna obliga a
// hacer scroll lateral con la otra mano mientras la sostienes, así que el
// selector existe como atajo sin arrastrar nada.
async function moveTo(post: Post, phase: PostStatus, fromDrag = false) {
  if (post.status === phase) return
  const fromPhase = post.status

  // La confirmación de saltarse al partner, la escritura y los avisos viven en
  // usePostActions (los comparte la Lista); aquí solo se refleja en las columnas.
  const result = await changeStatus(post, phase)

  if (result === 'ok') {
    if (!fromDrag) {
      // El selector de fase, a diferencia del drag, no reubica nada por su
      // cuenta — y `sync()` tampoco: solo añade ids que no reconoce, nunca
      // mueve uno que ya está en otra columna. Hay que moverla a mano.
      const idx = board[fromPhase].findIndex((p) => p.id === post.id)
      if (idx !== -1) board[fromPhase].splice(idx, 1)
      board[phase].push(post)
    }
    return
  }

  if (fromDrag) {
    // vuedraggable ya la había movido de columna de verdad al soltarla: si se
    // cancela o falla, hay que devolverla a mano a su columna real (no basta
    // con corregir el status, `sync()` solo añade ids que no reconoce).
    const idx = board[phase].findIndex((p) => p.id === post.id)
    if (idx !== -1) board[phase].splice(idx, 1)
    if (!board[fromPhase].some((p) => p.id === post.id)) board[fromPhase].push(post)
  }
  // Si falló la escritura, se vuelve a pedir lo que dice el servidor.
  if (result === 'failed') await refresh()
}

function onChange(phase: PostStatus, event: { added?: { element: Post } }) {
  const moved = event.added?.element
  if (moved) moveTo(moved, phase, true)
}

// Columnas colapsables en móvil (hallazgo #15 de la auditoría de
// usabilidad) — plegar una columna no bloquea mover una card ahí: cada
// card tiene su propio selector de fase (ver BoardCard.vue), que no
// necesita arrastrar nada ni que la columna de destino esté visible. Por
// defecto, colapsada si está vacía; tocar la cabecera pliega/despliega
// cualquiera a mano, y eso manda sobre el valor por defecto hasta que se
// vuelva a tocar (si no, cada cambio en el número de cards "olvidaría" la
// preferencia de quien la plegó queriendo dejarla así).
const manuallyToggledPhases = reactive<Partial<Record<PostStatus, boolean>>>({})
function isPhaseOpen(phase: PostStatus): boolean {
  const manual = manuallyToggledPhases[phase]
  return manual !== undefined ? manual : board[phase].length > 0
}
function togglePhaseOpen(phase: PostStatus) {
  manuallyToggledPhases[phase] = !isPhaseOpen(phase)
}

// Salto directo a una columna en móvil (ver nav de pills arriba del
// tablero) — las referencias se guardan a mano porque son dinámicas
// (una por fase, en un v-for), no hay una sola plantilla que recoja.
const phaseSectionEls: Partial<Record<PostStatus, Element>> = {}
function setPhaseSectionRef(phase: PostStatus, el: Element | ComponentPublicInstance | null) {
  if (el instanceof Element) phaseSectionEls[phase] = el
}
function jumpToPhase(phase: PostStatus) {
  phaseSectionEls[phase]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Panel lateral de edición rápida — abrir una card ya no navega a otra
// página, se queda en el tablero (ver PostEditSheet.vue).
const editingPost = ref<Post | null>(null)
const editOpen = ref(false)
function openEdit(post: Post) {
  editingPost.value = post
  editOpen.value = true
}

// Límite de WIP por columna — solo un aviso visual, no bloquea nada (no
// tendría sentido impedir mover una card porque la columna esté "llena").
const wipLimits = computed(() => creator.value?.boardWipLimits ?? {})
const wipEditingPhase = ref<PostStatus | null>(null)
const wipInput = ref('')
function toggleWipEditor(phase: PostStatus) {
  if (wipEditingPhase.value === phase) {
    wipEditingPhase.value = null
    return
  }
  wipEditingPhase.value = phase
  wipInput.value = wipLimits.value[phase] ? String(wipLimits.value[phase]) : ''
}
async function saveWipLimit(phase: PostStatus) {
  const n = parseInt(wipInput.value, 10)
  await setWipLimit(phase, Number.isFinite(n) && n > 0 ? n : null)
  wipEditingPhase.value = null
}
function isOverLimit(phase: PostStatus) {
  const limit = wipLimits.value[phase]
  return !!limit && board[phase].length > limit
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

const bulkDeleting = ref(false)
async function bulkDelete() {
  const n = selectedIds.value.size
  const ok = await confirm({
    title: `¿Borrar ${n === 1 ? '1 publicación' : `${n} publicaciones`}?`,
    message: 'Se borrarán permanentemente, junto con sus predicciones de éxito si las tenían.',
    confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
  })
  if (!ok) return
  bulkDeleting.value = true
  try {
    const results = await Promise.allSettled([...selectedIds.value].map((id) => deletePost(id)))
    const failed = results.filter((r) => r.status === 'rejected').length
    const done = results.length - failed
    if (done) toast.success(done === 1 ? 'Publicación borrada' : `${done} publicaciones borradas`)
    if (failed) toast.error(failed === 1 ? 'No se ha podido borrar 1 publicación.' : `No se han podido borrar ${failed} publicaciones.`)
    cancelSelection()
  } finally {
    bulkDeleting.value = false
  }
}
</script>

<template>
  <div>
    <PostFilterBar v-if="posts.length" v-model:filters="filters" :collabs="collabRequests" class="mb-5">
      <template #end>
        <button
          type="button" class="text-[0.8125rem] font-medium transition-colors"
          :class="selectionMode ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
          @click="selectionMode ? cancelSelection() : (selectionMode = true)"
        >
          {{ selectionMode ? 'Cancelar' : 'Seleccionar' }}
        </button>
      </template>
    </PostFilterBar>

    <EmptyState
      v-if="!posts.length"
      icon="ph:kanban-bold" title="Aquí irán todas tus publicaciones"
      description="Una publicación es cualquier pieza de contenido que gestionas en FEEDMA: puede ser propia (solo tú la ves) o el entregable de una colaboración (el partner la ve y la aprueba). Crea la primera con el botón + de abajo — luego la vas moviendo de columna a medida que avanza: de Idea a En producción, Para revisar, Programado y Publicado."
    />
    <EmptyState
      v-else-if="hasFilters && !filteredPosts.length"
      icon="ph:funnel" title="Ningún resultado con estos filtros"
      description="Prueba a quitar el buscador o alguno de los filtros de arriba."
    >
      <BaseButton variant="secondary" size="sm" icon="ph:x-bold" @click="clearFilters">Quitar filtros</BaseButton>
    </EmptyState>
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-4 lg:items-start select-none">
      <!-- Solo en móvil: las 5 columnas se apilan en vertical (hallazgo #15
           de la auditoría de usabilidad) — bajar hasta "Publicado" a mano
           puede ser mucho scroll si "Idea" tiene varias cards. Un salto
           directo además de plegar las columnas vacías (más abajo). -->
      <div class="lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 nx-scroll">
        <button
          v-for="phase in phases" :key="phase" type="button"
          class="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[0.75rem] font-medium border border-[var(--color-hairline-strong)]"
          :style="{ color: statusMeta[phase].color }"
          @click="jumpToPhase(phase)"
        >
          <span class="size-1.5 rounded-full shrink-0" :style="{ background: statusMeta[phase].color }" />
          {{ statusMeta[phase].label }} ({{ board[phase].length }})
        </button>
      </div>

      <section v-for="phase in phases" :key="phase" :ref="(el) => setPhaseSectionRef(phase, el)" class="flex flex-col min-w-0 lg:max-w-[20rem]">
        <div class="mb-3">
          <div class="flex items-center gap-2 px-0.5">
            <span class="size-2 rounded-full shrink-0" :style="{ background: statusMeta[phase].color }" />
            <h2 class="text-[0.8125rem] font-medium text-[var(--color-text)]">{{ statusMeta[phase].label }}</h2>
            <span
              class="flex items-center justify-center size-4 rounded-full text-[var(--color-text-faint)] cursor-help" tabindex="0"
              :title="phaseDescription[phase]" :aria-label="phaseDescription[phase]"
            >
              <Icon name="ph:question-fill" class="size-3" />
            </span>
            <div class="ml-auto flex items-center gap-1">
              <Icon v-if="isOverLimit(phase)" name="ph:warning-fill" class="size-3.5 text-[var(--color-status-alert)]" />
              <span class="text-[0.75rem]" :class="isOverLimit(phase) ? 'text-[var(--color-status-alert)] font-semibold' : 'text-[var(--color-text-faint)]'">
                {{ board[phase].length }}{{ wipLimits[phase] ? `/${wipLimits[phase]}` : '' }}
              </span>
              <button
                type="button" aria-label="Límite de la columna"
                class="size-5 flex items-center justify-center rounded-full text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)]"
                @click="toggleWipEditor(phase)"
              >
                <Icon name="ph:gear-six-bold" class="size-3" />
              </button>
              <button
                type="button" class="lg:hidden size-5 flex items-center justify-center rounded-full text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)]"
                :aria-label="isPhaseOpen(phase) ? `Plegar ${statusMeta[phase].label}` : `Desplegar ${statusMeta[phase].label}`" :aria-expanded="isPhaseOpen(phase)"
                @click="togglePhaseOpen(phase)"
              >
                <Icon name="ph:caret-down-bold" class="size-3 transition-transform" :class="!isPhaseOpen(phase) && '-rotate-90'" />
              </button>
            </div>
          </div>
          <div v-if="wipEditingPhase === phase" class="flex items-center gap-1.5 mt-2 px-0.5">
            <input
              v-model="wipInput" type="number" min="1" placeholder="Sin límite"
              class="w-24 h-7 px-2 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.75rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
              @keydown.enter.prevent="saveWipLimit(phase)"
            >
            <button type="button" class="text-[0.75rem] font-medium text-[var(--color-primary-500)]" @click="saveWipLimit(phase)">Guardar</button>
          </div>
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
          class="lg:!flex flex-col gap-2.5 min-h-[3.5rem] max-h-[calc(100vh-18rem)] overflow-y-auto nx-scroll rounded-[var(--radius-md)] p-1.5 -m-1.5"
          :class="isPhaseOpen(phase) ? 'flex' : 'hidden'"
          @change="(e: { added?: { element: Post } }) => onChange(phase, e)"
        >
          <template #item="{ element }: { element: Post }">
            <div class="relative" :class="isOverdue(element) && 'rounded-[var(--radius-md)] ring-2 ring-[var(--color-status-alert)]'">
              <BoardCard :post="element" :phases="phases" :overdue="isOverdue(element)" :project="projectNameOf(element)" @open="openEdit(element)" @move="moveTo(element, $event)" />
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

    <PostEditSheet v-model="editOpen" :post="editingPost" :phases="phases" @move="(status) => editingPost && moveTo(editingPost, status)" />
  </div>
</template>

<style scoped>
.nx-phase-ghost {
  opacity: 0.4;
}
</style>

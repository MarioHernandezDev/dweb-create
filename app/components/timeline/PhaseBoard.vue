<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Post, PostStatus } from '~/types'
import { statusMeta } from '~/utils/status'

defineEmits<{ open: [post: Post] }>()

const { posts, updatePost, refresh } = useMyPosts()

// Fases del tablero, en el orden en que se recorren de verdad — "overdue" no
// es una fase a la que se arrastre nada, es una fecha pasada (ver aviso en
// cada card), así que se queda fuera de las columnas.
const phases: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']

// Las columnas viven en su propio estado local, mutado directamente por
// vuedraggable al arrastrar — si se derivaran de `posts` con un `computed`,
// cada arrastre se deshacía solo en el siguiente tick (el computed no sabe
// que ese movimiento ya es "la verdad", lo trataría como algo que revertir).
const board = reactive<Record<PostStatus, Post[]>>(
  Object.fromEntries(phases.map((phase) => [phase, []])) as Record<PostStatus, Post[]>
)

// Reparte `posts` en las columnas sin tocar el orden de arrastre ya hecho:
// solo añade lo que falta y quita lo que ya no está (post nuevo creado con
// el Fab, post borrado desde su página, etc.).
function sync() {
  const known = new Set(phases.flatMap((phase) => board[phase].map((p) => p.id)))
  for (const post of posts.value) {
    if (!known.has(post.id) && phases.includes(post.status)) board[post.status].push(post)
  }
  const stillThere = new Set(posts.value.map((p) => p.id))
  for (const phase of phases) {
    board[phase] = board[phase].filter((p) => stillThere.has(p.id))
  }
}

watch(posts, sync, { immediate: true })

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
</script>

<template>
  <EmptyState
    v-if="!posts.length"
    icon="ph:kanban-bold" title="No hay entregas por aquí"
    description="Crea tu primera publicación con el botón de abajo y empieza a moverla por el tablero."
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
        :animation="150"
        :delay="150"
        :delay-on-touch-only="true"
        :scroll="true"
        :scroll-sensitivity="120"
        :scroll-speed="16"
        :bubble-scroll="true"
        :force-fallback="true"
        ghost-class="nx-phase-ghost"
        class="flex flex-col gap-2.5 min-h-[3.5rem] rounded-[var(--radius-md)] p-1.5 -m-1.5"
        @change="(e: { added?: { element: Post } }) => onChange(phase, e)"
      >
        <template #item="{ element }: { element: Post }">
          <div :class="isOverdue(element) && 'rounded-[var(--radius-md)] ring-2 ring-[var(--color-status-alert)]'">
            <BoardCard :post="element" :phases="phases" @open="$emit('open', $event)" @move="moveTo(element, $event)" />
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
</template>

<style scoped>
.nx-phase-ghost {
  opacity: 0.4;
}
</style>

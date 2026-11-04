<script setup lang="ts">
import type { Creator, Post } from '~/types'
import { dueLabel } from '~/utils/status'

const props = withDefaults(defineProps<{
  posts: Post[]
  creatorsById?: Record<string, Creator>
  /** Si el creador tiene publicaciones en absoluto (en cualquier fecha) — sin esto, "sin entregas en los próximos días" y "nunca has creado nada" se veían exactamente igual. */
  hasAnyPosts?: boolean
  /** `false` cuando se embebe dentro de un panel estrecho (ej. BottomSheet, ~448px) — los breakpoints de Tailwind miden el viewport, no el contenedor, así que la rejilla a 2 columnas se activaría igual en escritorio aunque el panel sea angosto. */
  twoColumn?: boolean
  /** Reenviado a cada DeliverableCard — ver ese componente. */
  interactive?: boolean
}>(), { twoColumn: true, interactive: true })

defineEmits<{ open: [post: Post] }>()

const groups = computed(() => {
  const sorted = [...props.posts].sort((a, b) => a.dueInDays - b.dueInDays)
  const map = new Map<number, Post[]>()
  for (const post of sorted) {
    const bucket = map.get(post.dueInDays) ?? []
    bucket.push(post)
    map.set(post.dueInDays, bucket)
  }
  return Array.from(map.entries()).map(([dueInDays, items]) => ({ dueInDays, label: dueLabel(dueInDays), items }))
})
</script>

<template>
  <div class="flex flex-col gap-7">
    <EmptyState
      v-if="!posts.length && !hasAnyPosts"
      icon="ph:calendar-blank" title="Aquí no hay ninguna publicación todavía"
      description="Cuando se añadan publicaciones, aparecerán organizadas por fecha."
    />
    <EmptyState
      v-else-if="!posts.length"
      icon="ph:check-circle" title="Nada pendiente en los próximos días"
      description="No hay entregas para hoy ni para los próximos 3 días."
    />
    <section v-for="group in groups" :key="group.dueInDays">
      <h2
        class="text-sm font-medium mb-2.5"
        :class="group.dueInDays < 0 ? 'text-[var(--color-status-alert)]' : group.dueInDays === 0 ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-muted)]'"
      >
        {{ group.label }}
      </h2>
      <div class="flex flex-col gap-2.5" :class="twoColumn && 'lg:grid lg:grid-cols-2 lg:gap-3'">
        <div
          v-for="(post, i) in group.items" :key="post.id"
          class="nx-stagger-in" :style="{ '--stagger-i': i }"
        >
          <DeliverableCard :post="post" :creator="creatorsById?.[post.creatorId]" :interactive="interactive" @open="$emit('open', $event)">
            <template v-if="$slots.actions" #actions>
              <slot name="actions" :post="post" />
            </template>
          </DeliverableCard>
        </div>
      </div>
    </section>
  </div>
</template>

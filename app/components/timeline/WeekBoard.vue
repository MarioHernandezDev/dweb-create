<script setup lang="ts">
import type { ClientAccount, Post } from '~/types'
import { dueLabel } from '~/utils/status'

const props = defineProps<{
  posts: Post[]
  clientsById?: Record<string, ClientAccount>
}>()

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
      v-if="!posts.length"
      icon="ph:calendar-blank" title="No hay entregas por aquí"
      description="Cuando se añadan publicaciones a este tablero, aparecerán organizadas por fecha."
    />
    <section v-for="group in groups" :key="group.dueInDays">
      <h2
        class="text-[0.8125rem] font-medium mb-2.5"
        :class="group.dueInDays < 0 ? 'text-[var(--color-status-alert)]' : group.dueInDays === 0 ? 'text-[var(--color-flame-500)]' : 'text-[var(--color-text-muted)]'"
      >
        {{ group.label }}
      </h2>
      <div class="flex flex-col gap-2.5">
        <DeliverableCard
          v-for="post in group.items" :key="post.id" :post="post"
          :client="clientsById?.[post.clientId]"
        >
          <template v-if="$slots.actions" #actions>
            <slot name="actions" :post="post" />
          </template>
        </DeliverableCard>
      </div>
    </section>
  </div>
</template>

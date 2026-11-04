<script setup lang="ts">
import type { Creator, Post } from '~/types'
import { contentTypeMeta, statusMeta, isPostOverdue, overdueLabel } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'

const props = withDefaults(defineProps<{
  post: Post
  creator?: Creator
  /** `false` para un uso puramente informativo (ej. calendario acotado a una colaboración, dentro de una hoja ya abierta) — sin role/tabindex/cursor de mano ni emisión de `open`. */
  interactive?: boolean
}>(), { interactive: true })

defineEmits<{ open: [post: Post] }>()

const overdue = computed(() => isPostOverdue(props.post))

// Mismo lenguaje que BoardCard/PackageCard/FeaturedDeck: textura de
// claqueta desaturada (papel + rayas diagonales) en vez de un degradado al
// azar cuando no hay foto real — antes era la única pantalla que seguía con
// el molde visual anterior (sombra difusa + gradiente vistoso).
const coverStyle = computed(() => {
  const hue = Number(props.post.cover.from.match(/hsl\((\d+)/)?.[1] ?? 0)
  return {
    backgroundColor: `hsl(${hue} 24% 93%)`,
    backgroundImage: 'repeating-linear-gradient(45deg, rgb(26 22 37 / 5%) 0 8px, transparent 8px 16px)'
  }
})
</script>

<template>
  <!-- role="button" en vez de un <button> real: lleva un <slot name="actions">
       con sus propios controles interactivos dentro (mismo motivo que BoardCard.vue). -->
  <div
    class="relative rounded-[var(--radius-sm)]" :class="interactive && 'cursor-pointer select-none'"
    :role="interactive ? 'button' : undefined" :tabindex="interactive ? 0 : undefined"
    :aria-label="interactive ? `Abrir «${post.title}»` : undefined" style="box-shadow: 3px 3px 0 0 rgb(26 22 37 / 7%), 6px 6px 0 0 rgb(26 22 37 / 4%)"
    @click="interactive && $emit('open', post)" @keydown.enter="interactive && $emit('open', post)" @keydown.space.prevent="interactive && $emit('open', post)"
  >
    <div class="flex gap-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper)]">
      <div class="w-1 shrink-0" :style="{ background: statusMeta[post.status].color }" />

      <div class="flex gap-3.5 p-4 flex-1 min-w-0">
        <div
          class="relative size-16 shrink-0 rounded-[var(--radius-xs)] overflow-hidden flex items-center justify-center"
          :style="!post.mediaUrl ? coverStyle : undefined"
        >
          <img v-if="post.mediaUrl" :src="post.mediaUrl" alt="" class="absolute inset-0 size-full object-cover">
          <Icon v-else :name="contentTypeMeta[post.contentType].icon" class="size-6 text-[var(--color-text)] opacity-30" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <p class="text-base font-medium text-[var(--color-text)] leading-snug line-clamp-2">{{ post.title }}</p>
            <Icon :name="platformMeta[post.platform].icon" class="size-4 shrink-0 mt-0.5" :style="{ color: platformMeta[post.platform].colorVar }" />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span v-if="overdue" class="inline-flex items-center gap-1 text-micro font-medium text-[var(--color-status-alert)]">
              <Icon name="ph:warning-fill" class="size-3.5" />
              {{ overdueLabel(post.dueInDays) }}
            </span>
            <StatusPill :status="post.status" compact />
            <span v-if="creator" class="inline-flex items-center gap-1 text-micro text-[var(--color-text-faint)]">
              <span class="size-1 rounded-full bg-[var(--color-text-faint)]" />
              {{ creator.name }}
            </span>
            <span v-if="post.successScore" class="inline-flex items-center gap-1 text-micro font-medium text-[var(--color-signal-500)]">
              <Icon name="ph:sparkle-fill" class="size-3.5" />
              {{ post.successScore }}
            </span>
            <span v-if="post.checklist.total" class="inline-flex items-center gap-1 text-micro text-[var(--color-text-faint)]">
              <Icon name="ph:check-square-fill" class="size-3.5" :class="post.checklist.done === post.checklist.total && 'text-[var(--color-status-published)]'" />
              {{ post.checklist.done }}/{{ post.checklist.total }}
            </span>
          </div>

          <div @click.stop>
            <slot name="actions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

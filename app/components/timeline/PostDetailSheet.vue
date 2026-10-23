<script setup lang="ts">
import { contentTypeMeta, dueLabel } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'
import type { Creator, Post } from '~/types'

const props = defineProps<{
  post: Post | null
  creator?: Creator
}>()

const open = defineModel<boolean>({ default: false })

// Checklist de solo lectura (ver supabase/migrations/20261025160000_
// checklist_partner_visibility.sql) — mismo composable que ya usa el
// creador, sin checkbox interactivo: aquí es información de progreso, no
// una acción del partner. Se carga perezosamente al abrir la hoja, nunca
// bloqueando el resto del contenido ya disponible sin red.
const { itemsByPost, ensureItems } = useChecklist()
const checklistItems = computed(() => (props.post ? itemsByPost.value[props.post.id] ?? [] : []))
watch(() => props.post?.id, (postId) => { if (postId) ensureItems(postId) }, { immediate: true })
</script>

<template>
  <BottomSheet v-model="open" :title="post?.title ?? 'Publicación'">
    <template v-if="post">
      <div
        class="relative h-32 rounded-[var(--radius-md)] overflow-hidden flex items-center justify-center mb-5"
        :style="!post.mediaUrl ? { background: `linear-gradient(${post.cover.angle}deg, ${post.cover.from}, ${post.cover.to})` } : undefined"
      >
        <img v-if="post.mediaUrl" :src="post.mediaUrl" alt="" class="absolute inset-0 size-full object-cover">
        <Icon v-else :name="contentTypeMeta[post.contentType].icon" class="size-8 text-white/90" />
      </div>

      <div class="flex items-center gap-2 flex-wrap mb-4">
        <StatusPill :status="post.status" />
        <span v-if="creator" class="text-[0.8125rem] text-[var(--color-text-muted)]">{{ creator.name }}</span>
        <span class="text-[0.8125rem] text-[var(--color-text-faint)]">· {{ dueLabel(post.dueInDays) }}</span>
      </div>

      <p v-if="post.caption" class="text-[0.9375rem] text-[var(--color-text)] leading-relaxed mb-4">{{ post.caption }}</p>
      <p v-else class="text-[0.9375rem] text-[var(--color-text-faint)] italic mb-4">Sin caption todavía.</p>

      <div class="flex items-center gap-4 text-[0.8125rem] text-[var(--color-text-muted)] mb-4">
        <span class="inline-flex items-center gap-1.5">
          <Icon :name="platformMeta[post.platform].icon" class="size-4" :style="{ color: platformMeta[post.platform].colorVar }" />
          {{ platformMeta[post.platform].label }}
        </span>
        <span>{{ contentTypeMeta[post.contentType].label }}</span>
      </div>

      <p v-if="post.hashtags.length" class="flex flex-wrap gap-1.5">
        <span v-for="tag in post.hashtags" :key="tag" class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ tag }}</span>
      </p>

      <div v-if="checklistItems.length" class="mt-4">
        <h3 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-2">Checklist</h3>
        <ul class="flex flex-col gap-1.5">
          <li v-for="item in checklistItems" :key="item.id" class="flex items-center gap-2 text-[0.8125rem]">
            <Icon
              :name="item.done ? 'ph:check-square-fill' : 'ph:square-bold'"
              class="size-4 shrink-0" :class="item.done ? 'text-[var(--color-status-published)]' : 'text-[var(--color-text-faint)]'"
            />
            <span :class="item.done ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'">{{ item.text }}</span>
          </li>
        </ul>
      </div>

      <slot name="actions" :post="post" />
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { contentTypeMeta, dueLabel } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'
import type { Creator, Post } from '~/types'

const props = defineProps<{
  post: Post | null
  creator?: Creator
}>()

const open = defineModel<boolean>({ default: false })
</script>

<template>
  <BottomSheet v-model="open" :title="post?.title ?? 'Publicación'">
    <template v-if="post">
      <div
        class="relative h-32 rounded-[var(--radius-md)] overflow-hidden flex items-center justify-center mb-5"
        :style="{ background: `linear-gradient(${post.cover.angle}deg, ${post.cover.from}, ${post.cover.to})` }"
      >
        <Icon :name="contentTypeMeta[post.contentType].icon" class="size-8 text-white/90" />
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

      <slot name="actions" :post="post" />
    </template>
  </BottomSheet>
</template>

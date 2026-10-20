<script setup lang="ts">
import type { Creator, Post } from '~/types'
import { contentTypeMeta, statusMeta } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'

const props = defineProps<{
  post: Post
  creator?: Creator
}>()

defineEmits<{ open: [post: Post] }>()
</script>

<template>
  <BaseCard radius="md" padding="none" interactive class="overflow-hidden flex gap-0" @click="$emit('open', post)">
    <div class="w-1 shrink-0" :style="{ background: statusMeta[post.status].color }" />

    <div class="flex gap-3.5 p-4 flex-1 min-w-0">
      <div
        class="relative size-16 shrink-0 rounded-[var(--radius-sm)] overflow-hidden flex items-center justify-center"
        :style="{ background: `linear-gradient(${post.cover.angle}deg, ${post.cover.from}, ${post.cover.to})` }"
      >
        <Icon :name="contentTypeMeta[post.contentType].icon" class="size-6 text-white/90" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="text-[0.9375rem] font-medium text-[var(--color-text)] leading-snug line-clamp-2">{{ post.title }}</p>
          <Icon :name="platformMeta[post.platform].icon" class="size-4 shrink-0 mt-0.5" :style="{ color: platformMeta[post.platform].colorVar }" />
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-2">
          <StatusPill :status="post.status" compact />
          <span v-if="creator" class="inline-flex items-center gap-1 text-[0.75rem] text-[var(--color-text-faint)]">
            <span class="size-1 rounded-full bg-[var(--color-text-faint)]" />
            {{ creator.name }}
          </span>
          <span v-if="post.successScore" class="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[var(--color-signal-500)]">
            <Icon name="ph:sparkle-fill" class="size-3.5" />
            {{ post.successScore }}
          </span>
        </div>

        <div @click.stop>
          <slot name="actions" />
        </div>
      </div>
    </div>
  </BaseCard>
</template>

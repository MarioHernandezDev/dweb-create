<script setup lang="ts">
import type { Post, PostStatus } from '~/types'
import { contentTypeMeta, statusMeta } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'

defineProps<{ post: Post; phases: PostStatus[] }>()
defineEmits<{ open: [post: Post]; move: [status: PostStatus] }>()
</script>

<template>
  <BaseCard radius="md" padding="none" interactive class="overflow-hidden" @click="$emit('open', post)">
    <div
      class="relative h-28 w-full flex items-center justify-center"
      :style="!post.mediaUrl ? { background: `linear-gradient(${post.cover.angle}deg, ${post.cover.from}, ${post.cover.to})` } : undefined"
    >
      <img v-if="post.mediaUrl" :src="post.mediaUrl" alt="" class="absolute inset-0 size-full object-cover">
      <Icon v-else :name="contentTypeMeta[post.contentType].icon" class="size-7 text-white/90" />

      <span class="absolute top-2 right-2 flex items-center justify-center size-6 rounded-full bg-black/45 backdrop-blur-sm">
        <Icon :name="platformMeta[post.platform].icon" class="size-3.5 text-white" />
      </span>
    </div>

    <div class="p-3">
      <p class="text-[0.875rem] font-medium text-[var(--color-text)] leading-snug line-clamp-2 min-h-[2.5em] mb-2.5">
        {{ post.title }}
      </p>

      <select
        class="w-full h-9 px-2 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium text-white text-center"
        :style="{ background: statusMeta[post.status].color }"
        :value="post.status"
        aria-label="Cambiar de fase"
        @click.stop
        @change="$emit('move', ($event.target as HTMLSelectElement).value as PostStatus)"
      >
        <option v-for="p in phases" :key="p" :value="p" class="bg-[var(--color-ink-raised)] text-[var(--color-text)]">
          {{ statusMeta[p].label }}
        </option>
      </select>
    </div>
  </BaseCard>
</template>

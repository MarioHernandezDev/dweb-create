<script setup lang="ts">
import type { PostStatus } from '~/types'
import { statusMeta } from '~/utils/status'

const props = defineProps<{ status: PostStatus; compact?: boolean }>()
const meta = computed(() => statusMeta[props.status])
</script>

<template>
  <span
    class="inline-flex items-center rounded-[var(--radius-xs)] font-medium"
    :class="compact ? 'gap-1 px-2 py-0.5 text-[0.6875rem]' : 'gap-1.5 px-2.5 py-1 text-[0.75rem]'"
    :style="{ color: meta.color, background: `color-mix(in oklab, ${meta.color} 16%, transparent)` }"
  >
    <Icon :name="meta.icon" class="size-[1em]" />
    {{ meta.label }}
  </span>
</template>

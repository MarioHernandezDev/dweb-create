<script setup lang="ts">
import type { PostStatus } from '~/types'
import { statusMeta } from '~/utils/status'

/** Fase de una publicación: chip rectangular con tinte y texto tinta. El color lo decide el CSS por `data-status`. */
const props = defineProps<{ status: PostStatus; compact?: boolean }>()
const label = computed(() => statusMeta[props.status].label)
</script>

<template>
  <span class="phase-chip" :class="compact && 'phase-chip--compact'" :data-status="status">{{ label }}</span>
</template>

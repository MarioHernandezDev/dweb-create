<script setup lang="ts">
import type { CollaborationStatus } from '~/types'
import { collaborationStatusMeta } from '~/utils/status'

/** Estado de una colaboración: píldora con contorno. Distinto a propósito del chip de fase. */
const props = defineProps<{ status: CollaborationStatus; compact?: boolean }>()
const label = computed(() => collaborationStatusMeta[props.status].label)
</script>

<template>
  <span class="collab-status" :class="compact && 'collab-status--compact'" :data-status="status">{{ label }}</span>
</template>

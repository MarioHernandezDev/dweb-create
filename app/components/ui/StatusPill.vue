<script setup lang="ts">
import type { PostStatus } from '~/types'

/** Adaptador: las pantallas que aún usan StatusPill reciben el chip de fase nuevo. Nuevo código: PhaseChip. */
defineProps<{ status: PostStatus; compact?: boolean }>()
</script>

<template>
  <PhaseChip :status="status" :compact="compact" />
</template>

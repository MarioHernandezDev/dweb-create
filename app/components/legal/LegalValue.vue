<script setup lang="ts">
import { PLACEHOLDER_MARK } from '~/utils/legal'

const props = defineProps<{ value: string }>()
const pending = computed(() => props.value.startsWith(PLACEHOLDER_MARK))
</script>

<template>
  <mark v-if="pending" class="rounded px-1 bg-[var(--color-logo-amber)]/30 text-[var(--color-text)]">{{ value }}</mark>
  <span v-else>{{ value }}</span>
</template>

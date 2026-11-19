<script setup lang="ts">
import { PLACEHOLDER_MARK } from '~/utils/legal'

const props = defineProps<{ value: string }>()
const pending = computed(() => props.value.startsWith(PLACEHOLDER_MARK))
</script>

<template>
  <mark v-if="pending" class="legal-pending">{{ value }}</mark>
  <span v-else>{{ value }}</span>
</template>

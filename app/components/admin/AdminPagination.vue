<script setup lang="ts">
/** Pie de lista: «26–50 de 342» y anterior/siguiente. */
const props = defineProps<{ page: number; pageSize: number; total: number; loading?: boolean }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const first = computed(() => (props.total ? (props.page - 1) * props.pageSize + 1 : 0))
const last = computed(() => Math.min(props.total, props.page * props.pageSize))
</script>

<template>
  <div v-if="total > 0" class="flex items-center justify-between gap-3 pt-2" data-admin-pagination>
    <p class="text-micro text-[var(--color-text-faint)]" role="status">{{ first }}–{{ last }} de {{ total }}</p>
    <div class="flex items-center gap-2">
      <BaseButton variant="outline" size="sm" icon="ph:caret-left-bold" :disabled="page <= 1 || loading" aria-label="Página anterior" @click="emit('update:page', page - 1)" />
      <span class="text-micro text-[var(--color-text-muted)] tabular-nums">{{ page }} / {{ pages }}</span>
      <BaseButton variant="outline" size="sm" icon="ph:caret-right-bold" :disabled="page >= pages || loading" aria-label="Página siguiente" @click="emit('update:page', page + 1)" />
    </div>
  </div>
</template>

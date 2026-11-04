<script setup lang="ts">
/** Pares etiqueta/valor con <dl> semántico. Los valores vacíos se muestran como «—», nunca como 0. */
defineProps<{ items: { label: string; value: string | number | null | undefined }[]; columns?: boolean }>()
</script>

<template>
  <dl class="data-list" :class="columns && 'data-list--columns'">
    <div v-for="item in items" :key="item.label" class="data-list__row">
      <dt class="data-list__term">{{ item.label }}</dt>
      <dd class="data-list__value">{{ item.value === null || item.value === undefined || item.value === '' ? '—' : item.value }}</dd>
    </div>
  </dl>
</template>

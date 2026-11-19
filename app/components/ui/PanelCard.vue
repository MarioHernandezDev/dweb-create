<script setup lang="ts">
/** Tarjeta con título, descripción y una acción opcional (slot `action`). El contenido va en el slot por defecto; `footer` para el pie. */
defineProps<{ title: string; description?: string; padding?: 'none' | 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <BaseCard :padding="padding" radius="lg" class="panel">
    <div class="panel__header">
      <SectionTitle :title="title" :description="description" />
      <slot name="action" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="panel__footer"><slot name="footer" /></div>
  </BaseCard>
</template>

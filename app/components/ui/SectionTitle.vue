<script setup lang="ts">
/** Título de sección con descripción opcional y una acción a la derecha (slot por defecto). Los títulos dicen qué hay, no frases de presentación. */
withDefaults(defineProps<{ title: string; description?: string; as?: 'h2' | 'h3' }>(), { as: 'h2' })
</script>

<template>
  <div class="section-title">
    <div class="section-title__text">
      <component :is="as" class="section-title__title">{{ title }}</component>
      <p v-if="description" class="section-title__desc">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>

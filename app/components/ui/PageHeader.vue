<script setup lang="ts">
/** Cabecera de página: título (h1), subtítulo y acciones (slot por defecto). */
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <header class="page-header">
    <div>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="page-header__actions"><slot /></div>
  </header>
</template>

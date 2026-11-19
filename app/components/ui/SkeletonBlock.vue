<script setup lang="ts">
/**
 * Bloque de carga con la forma del contenido que sustituye, para que al llegar
 * los datos no haya saltos de maquetación. Las medidas viajan como variables CSS.
 */
withDefaults(defineProps<{ width?: string; height?: string; rounded?: string }>(), {
  width: '100%',
  height: '1rem',
  rounded: 'var(--radius-xs)'
})
</script>

<template>
  <span class="skeleton" :style="{ '--sk-w': width, '--sk-h': height, '--sk-r': rounded }" aria-hidden="true" />
</template>

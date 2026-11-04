<script setup lang="ts">
/**
 * Motivo de ondas de CIBERAN: anillos abiertos concéntricos que salen del
 * círculo del símbolo. Es el único gráfico de marca (propuesta §2.3): trazo
 * fino, baja opacidad, hereda el color con `currentColor`. Solo decorativo.
 */
defineProps<{ rings?: number }>()
</script>

<template>
  <svg class="waves" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
    <circle v-for="n in (rings ?? 5)" :key="n" cx="300" cy="300" :r="90 + n * 36" pathLength="100" />
  </svg>
</template>

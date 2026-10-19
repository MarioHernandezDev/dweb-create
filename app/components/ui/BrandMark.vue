<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <!-- Monograma propio de FEEDMA: una "F" cuyo brazo superior remata en punta
       de llama, para no depender de un icono de librería como marca. -->
  <svg viewBox="0 0 24 24" fill="currentColor" :class="$props.class" aria-hidden="true">
    <rect x="5" y="4" width="3.2" height="16" rx="1.4" />
    <path d="M8.2 4H14.2L17.6 5.8L14.2 7.6H8.2Z" />
    <rect x="8.2" y="11" width="6.5" height="2.8" rx="1.4" />
  </svg>
</template>

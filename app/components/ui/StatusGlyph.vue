<script setup lang="ts">
import type { PostStatus } from '~/types'

defineProps<{ status: PostStatus; class?: string }>()
</script>

<template>
  <!--
    Set propio de iconos de estado (no es un icon-font genérico): comparten
    grilla 20x20, trazo 1.6 y extremos redondeados. "Programado" y "Fuera de
    plazo" comparten el motivo del reloj a propósito — uno contenido, el otro
    señalizado con una bandera — para que la familia se lea como un sistema.
  -->
  <svg v-if="status === 'idea'" viewBox="0 0 20 20" fill="none" :class="$props.class" aria-hidden="true">
    <circle cx="10" cy="16" r="1.3" fill="currentColor" />
    <path d="M10 14.7 C10 12 9.8 9.5 10.2 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <path d="M10.2 10.5 C12 9.5 13 8 12.6 6.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </svg>

  <svg v-else-if="status === 'in_production'" viewBox="0 0 20 20" fill="none" :class="$props.class" aria-hidden="true">
    <path d="M4.5 9H15.5V16H4.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M4.5 9L5.3 4.2H16.3L15.5 9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M7.8 4.4L7 8.8M11.6 4.4L10.8 8.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
  </svg>

  <svg v-else-if="status === 'ready_for_review'" viewBox="0 0 20 20" fill="none" :class="$props.class" aria-hidden="true">
    <path d="M3.3 10C5.8 6.6 14.2 6.6 16.7 10C14.2 13.4 5.8 13.4 3.3 10Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    <circle cx="10.9" cy="10" r="1.6" fill="currentColor" />
  </svg>

  <svg v-else-if="status === 'scheduled'" viewBox="0 0 20 20" fill="none" :class="$props.class" aria-hidden="true">
    <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6" />
    <path d="M10 10L12.6 7.2M10 10L6.5 13.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </svg>

  <svg v-else-if="status === 'published'" viewBox="0 0 20 20" fill="none" :class="$props.class" aria-hidden="true">
    <path d="M4.5 10.3L8.3 14.2L15.8 5.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <svg v-else viewBox="0 0 20 20" fill="none" :class="$props.class" aria-hidden="true">
    <path d="M6 4V16.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <path d="M6 4.3L15 6.6L6 9.2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
  </svg>
</template>

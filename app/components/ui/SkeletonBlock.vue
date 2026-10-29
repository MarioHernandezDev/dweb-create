<script setup lang="ts">
/**
 * Bloque de carga con la forma del contenido que sustituye, para que al llegar
 * los datos no haya saltos de maquetación. La pulsación se desactiva sola con
 * `prefers-reduced-motion` (regla global de main.css).
 */
withDefaults(defineProps<{ width?: string; height?: string; rounded?: string }>(), {
  width: '100%',
  height: '1rem',
  rounded: 'var(--radius-xs)'
})
</script>

<template>
  <span
    class="block animate-pulse bg-[var(--color-ink-overlay)]"
    :style="{ width, height, borderRadius: rounded }"
    aria-hidden="true"
  />
</template>

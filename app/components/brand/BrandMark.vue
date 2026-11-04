<script setup lang="ts">
/**
 * Logotipo de CIBERAN: el símbolo (dos arcos de onda con el punto voltio) y,
 * opcionalmente, el wordmark. Es la única forma de pintar la marca en la app;
 * los SVG sueltos de public/img/brand son para favicon, manifiesto y correos.
 *
 * `tone`: "ink" para fondos claros, "light" para fondos oscuros (barra lateral,
 * portada). El tamaño sale de `size` (alto del símbolo, en px) y el wordmark
 * escala con él.
 */
withDefaults(defineProps<{
  tone?: 'ink' | 'light'
  wordmark?: boolean
  size?: number
  /** Texto accesible; vacío cuando el logotipo acompaña a un texto que ya dice «CIBERAN». */
  label?: string
}>(), {
  tone: 'ink',
  wordmark: true,
  size: 32,
  label: 'CIBERAN'
})
</script>

<template>
  <span
    class="brand-mark"
    :class="`brand-mark--${tone}`"
    :style="{ '--brand-size': `${size}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <svg class="brand-mark__symbol" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M 51.92 15.29 A 26 26 0 1 0 51.92 48.71" />
      <path d="M 41.96 23.64 A 13 13 0 1 0 41.96 40.36" />
      <circle cx="52" cy="32" r="6" />
    </svg>
    <span v-if="wordmark" class="brand-mark__word" aria-hidden="true">ciberan</span>
  </span>
</template>

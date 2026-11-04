<script setup lang="ts">
/**
 * Logotipo de CIBERAN: el símbolo (la manta raya dentro del círculo) y,
 * opcionalmente, el wordmark. Es la única forma de pintar la marca en la app;
 * los PNG de public/img/brand son para favicon, manifiesto y correos
 * (se generan con scripts/design/build-brand-assets.mjs).
 *
 * El símbolo es claro (blanco y voltio): necesita fondo oscuro.
 * - `tone="light"`: para fondos oscuros (barra lateral, portada). Sin ficha.
 * - `tone="ink"` (por defecto): para fondos claros. El símbolo se apoya en una
 *   ficha de tinta, que ocupa el alto indicado en `size`.
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
    <span class="brand-mark__symbol">
      <img src="/img/brand/mark-512.png" alt="" width="512" height="512" decoding="async">
    </span>
    <span v-if="wordmark" class="brand-mark__word" aria-hidden="true">ciberan</span>
  </span>
</template>

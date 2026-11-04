<script setup lang="ts">
/**
 * Símbolo de CIBERAN animado, pensado para la pantalla de carga y la portada.
 * Secuencia (todo CSS, solo transform/opacity/máscara):
 *   1. el trazo se revela con un barrido circular (~1,1 s, una vez);
 *   2. el símbolo entra con una escala suave;
 *   3. en bucle: un destello recorre solo la silueta del logo, el conjunto
 *      flota despacio y, con `rings`, salen ondas del círculo.
 * Con movimiento reducido se muestra el símbolo quieto.
 */
defineProps<{
  /** Alto en px; sin él, ocupa el ancho de su contenedor. */
  size?: number
  /** Ondas que salen del símbolo (pantalla de carga). */
  rings?: boolean
}>()
</script>

<template>
  <span class="animated-mark" :style="size ? { '--mark-size': `${size}px` } : undefined" aria-hidden="true">
    <span v-if="rings" class="animated-mark__ring" />
    <span v-if="rings" class="animated-mark__ring animated-mark__ring--late" />
    <img src="/img/brand/mark-512.png" alt="" width="512" height="512" class="animated-mark__img" decoding="async">
    <span class="animated-mark__shine" />
  </span>
</template>

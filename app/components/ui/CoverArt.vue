<script setup lang="ts">
import { hueFromString } from '~/utils/avatar'

/**
 * Portada generada para cuando no hay foto: un tinte de la paleta (elegido de
 * forma estable a partir de `seed`) con los anillos de marca. Sustituye a los
 * degradados y rayas que se calculaban con estilos en línea. El contenedor
 * decide el tamaño; este componente rellena su caja.
 */
const props = defineProps<{ seed: string; icon?: string }>()

const hue = computed(() => hueFromString(props.seed))
const tint = computed(() => Math.floor(hue.value / 72) % 5)
</script>

<template>
  <div class="cover-art" :data-tint="tint" :style="{ '--turn': `${hue}deg` }" aria-hidden="true">
    <WaveMotif :rings="4" class="cover-art__waves" />
    <Icon v-if="icon" :name="icon" class="cover-art__icon" />
  </div>
</template>

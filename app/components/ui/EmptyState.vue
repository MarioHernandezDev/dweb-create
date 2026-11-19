<script setup lang="ts">
/** Estado vacío: qué falta y, en el slot, qué hacer. Dice qué hay, sin eslóganes. */
/** `mascot`: en vez del icono, Raya (la mantarraya) con ese ánimo: para vacíos «de verdad» (nada todavía), no para «sin resultados con estos filtros». */
defineProps<{ icon: string; title: string; description?: string; mascot?: 'swim' | 'happy' | 'wow' | 'sleepy' }>()
</script>

<template>
  <div class="empty">
    <div v-if="mascot" class="empty__mascot"><RayMascot :size="88" :mood="mascot" /></div>
    <div v-else class="empty__icon"><Icon :name="icon" class="size-6" /></div>
    <div class="empty__text">
      <p class="empty__title">{{ title }}</p>
      <p v-if="description" class="empty__desc">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>

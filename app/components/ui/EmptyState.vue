<script setup lang="ts">
/** Estado vacío: qué falta y, en el slot, qué hacer. Dice qué hay, sin eslóganes. */
defineProps<{ icon: string; title: string; description?: string }>()
</script>

<template>
  <div class="empty">
    <div class="empty__icon"><Icon :name="icon" class="size-6" /></div>
    <div class="empty__text">
      <p class="empty__title">{{ title }}</p>
      <p v-if="description" class="empty__desc">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ icon: string; title: string; description?: string }>()
</script>

<template>
  <div class="flex flex-col items-center text-center gap-3 py-14 px-6">
    <div class="flex items-center justify-center size-14 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-text-faint)]">
      <Icon :name="icon" class="size-6" />
    </div>
    <div class="max-w-[30ch]">
      <p class="font-medium text-[var(--color-text)]">{{ title }}</p>
      <p v-if="description" class="text-sm text-[var(--color-text-muted)] mt-1">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ icon?: string }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="fixed z-20 right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-9 md:bottom-9 size-14 rounded-full bg-[var(--color-flame-500)] text-[var(--color-on-flame)] shadow-[0_12px_28px_-8px_var(--color-flame-500)] flex items-center justify-center active:scale-95 transition-transform"
    @click="$emit('click')"
  >
    <Icon :name="icon ?? 'ph:plus-bold'" class="size-6" />
  </button>
</template>

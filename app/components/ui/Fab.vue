<script setup lang="ts">
defineProps<{ icon?: string; active?: boolean }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="fixed z-20 right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-9 md:bottom-9 size-14 rounded-full bg-[var(--color-primary-500)] text-[var(--color-on-primary)] shadow-[0_12px_28px_-8px_var(--color-primary-500)] hover:shadow-[0_16px_34px_-6px_var(--color-primary-500)] flex items-center justify-center active:scale-90 transition-[transform,box-shadow] duration-300 ease-[var(--ease-spring-out)]"
    :class="active && 'rotate-45'"
    @click="$emit('click')"
  >
    <Icon :name="icon ?? 'ph:plus-bold'" class="size-6" />
  </button>
</template>

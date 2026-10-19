<script setup lang="ts">
const { theme, toggle } = useTheme()
</script>

<template>
  <button
    type="button" :aria-label="theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    class="size-9 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)] transition-colors"
    @click="toggle"
  >
    <Icon :name="theme === 'dark' ? 'ph:sun-fill' : 'ph:moon-fill'" class="size-5" />
  </button>
</template>

<script setup lang="ts">
// Reutiliza el mismo indicador que alimenta <NuxtLoadingIndicator> en
// app.vue: "throttle" (200ms por defecto) evita que esto parpadee en
// navegaciones rápidas, solo aparece si el proceso tarda de verdad.
const { isLoading } = useLoadingIndicator()
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-150" enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200" leave-to-class="opacity-0"
  >
    <div
      v-if="isLoading" role="status" aria-label="Cargando"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-sm"
    >
      <Icon name="ph:spinner-gap-bold" class="size-9 animate-spin text-[var(--color-primary-500)]" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
// Usa el mismo indicador que alimenta <NuxtLoadingIndicator> en app.vue:
// el «throttle» de Nuxt (200 ms) evita el parpadeo en navegaciones rápidas, y
// se cierra solo al terminar la navegación (también si falla). No hay ningún
// temporizador propio que pueda dejarlo colgado.
const { isLoading } = useLoadingIndicator()
</script>

<template>
  <Transition name="loading">
    <div v-if="isLoading" role="status" aria-label="Cargando" class="loading">
      <AnimatedMark :size="132" rings />
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * Página de error propia: cualquier ruta inexistente o `createError(...)` sin
 * capturar (publicación, perfil o conversación no encontrados…) cae aquí, en
 * español y con la marca, en lugar del 404 por defecto de Nuxt.
 */
const props = defineProps<{ error: { statusCode: number; statusMessage?: string } }>()

const isNotFound = computed(() => props.error.statusCode === 404)

useHead({ title: isNotFound.value ? 'Página no encontrada' : 'Ha ocurrido un error' })

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <main class="splash">
    <WaveMotif class="splash__waves" />
    <div class="splash__box">
      <RayMascot tone="light" :size="132" :mood="isNotFound ? 'wow' : 'sleepy'" />
      <p v-if="isNotFound" class="splash__code" aria-hidden="true">404</p>
      <h1 class="splash__title">{{ isNotFound ? 'Página no encontrada' : 'Algo ha ido mal' }}</h1>
      <p class="splash__text">
        {{
          isNotFound
            ? 'No existe nada en esta dirección, o puede que ya no esté disponible.'
            : (error.statusMessage || 'Ha ocurrido un error inesperado. Inténtalo de nuevo en un momento.')
        }}
      </p>
      <BaseButton variant="brand" size="lg" icon="ph:house-fill" @click="goHome">Volver al inicio</BaseButton>
    </div>
  </main>
</template>

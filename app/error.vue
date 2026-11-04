<script setup lang="ts">
/**
 * Página de error propia (hallazgo #20 de la auditoría de usabilidad) —
 * antes cualquier ruta inexistente o `createError(...)` sin capturar
 * (publicación/perfil/conversación no encontrada, etc.) caía en el 404 por
 * defecto de Nuxt: fondo oscuro distinto al resto de la app, texto en
 * inglés ("404 Page not found") y un enlace "Go back home". Esta pantalla
 * la sustituye para cualquier error no capturado en toda la app.
 */
const props = defineProps<{ error: { statusCode: number; statusMessage?: string } }>()

const isNotFound = computed(() => props.error.statusCode === 404)

useHead({ title: isNotFound.value ? 'Página no encontrada' : 'Ha ocurrido un error' })

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-ink)] flex flex-col items-center justify-center px-5 text-center">
    <BrandMark :size="44" class="mb-8" />
    <p class="font-display text-[1.75rem] md:text-[2.125rem] text-[var(--color-text)] mb-2.5">
      {{ isNotFound ? 'Página no encontrada' : 'Algo ha ido mal' }}
    </p>
    <p class="text-[0.9375rem] text-[var(--color-text-muted)] max-w-[40ch] leading-relaxed mb-8">
      {{
        isNotFound
          ? 'No existe nada en esta dirección, o puede que ya no esté disponible.'
          : (error.statusMessage || 'Ha ocurrido un error inesperado. Inténtalo de nuevo en un momento.')
      }}
    </p>
    <BaseButton variant="primary" size="lg" icon="ph:house-fill" @click="goHome">Volver al inicio</BaseButton>
  </div>
</template>

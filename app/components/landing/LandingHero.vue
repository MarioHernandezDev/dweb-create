<script setup lang="ts">
import { coverPhotos } from '~/utils/images'

const hero = coverPhotos.landing

// Lectura de "cámara grabando" puramente ambiental — un guiño de parte de
// rodaje, no un dato real. Arranca en un instante creíble en vez de 00:00:00.
const elapsed = ref(427)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => (elapsed.value += 1), 1000)
})
onUnmounted(() => clearInterval(timer))

const timecode = computed(() => {
  const h = Math.floor(elapsed.value / 3600)
  const m = Math.floor((elapsed.value % 3600) / 60)
  const s = elapsed.value % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
})
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden flex flex-col">
    <!-- Base sólida siempre visible, independiente de si la foto ya ha
         cargado: el contraste del texto nunca depende de una descarga de red. -->
    <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-900)] via-[#150c34] to-[#0a0812]" />

    <NuxtImg
      provider="unsplash" :src="hero.id" :alt="hero.alt" fit="crop" :width="1920" :height="1200"
      :quality="78" format="webp" class="absolute inset-0 size-full object-cover opacity-55"
    />

    <!-- Scrim propio (no el de CoverImage): más oscuro de base para que el
         texto blanco tenga contraste suficiente encima de cualquier foto. -->
    <div
      class="absolute inset-0"
      style="background: linear-gradient(195deg, rgb(8 6 18 / 45%) 0%, rgb(8 6 18 / 72%) 45%, rgb(8 6 18 / 92%) 100%)"
    />

    <!-- Mancha ambiental: el único movimiento permanente de la app -->
    <div
      aria-hidden="true"
      class="absolute -top-40 -right-40 size-[34rem] md:size-[46rem] rounded-full blur-[110px] opacity-[0.35] nx-hero-blob"
      style="background: radial-gradient(circle, var(--color-logo-teal), var(--color-primary-500) 55%, transparent 72%)"
    />

    <main class="relative z-10 flex-1 flex flex-col justify-center px-5 md:px-10 lg:px-16 pb-10 pt-24 md:pt-16 max-w-7xl mx-auto w-full">
      <span class="inline-flex items-center gap-2 text-[0.75rem] font-medium text-white/55 tracking-[0.04em] mb-5 md:mb-6">
        <span class="relative flex size-1.5">
          <span class="absolute inset-0 rounded-full bg-[var(--color-status-alert)] animate-ping" />
          <span class="relative size-1.5 rounded-full bg-[var(--color-status-alert)]" />
        </span>
        REC · {{ timecode }}
      </span>

      <h1 class="nx-feedma-shimmer font-display font-light leading-[0.8] tracking-tight text-[clamp(3.25rem,14vw,13rem)] -ml-1 mb-1 md:mb-2">
        FEEDMA
      </h1>

      <h2 class="font-display text-white text-[1.375rem] sm:text-[1.75rem] md:text-[2.25rem] leading-[1.15] max-w-[22ch] md:max-w-[26ch] mb-3 md:mb-4">
        El parte de rodaje de tu contenido.
      </h2>
      <p class="text-white/70 text-[0.9375rem] md:text-[1.0625rem] leading-relaxed max-w-[34ch] md:max-w-[46ch] mb-8 md:mb-10">
        Entregas, métricas y predicciones de éxito — marcas, influencers y sus managers, todo en un solo sitio.
      </p>

      <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none">
        <BaseButton to="/login" variant="primary" size="lg" icon="ph:arrow-right-bold" class="w-full sm:w-auto sm:px-10">
          Acceder a tu cuenta
        </BaseButton>
        <NuxtLink to="/onboarding" class="text-[0.875rem] text-white/60 hover:text-white underline underline-offset-4 decoration-white/30">
          ¿No tienes cuenta? Mira cómo sería el registro
        </NuxtLink>
      </div>
    </main>

    <div class="relative z-10 flex items-center justify-between px-5 pb-5 md:px-10 md:pb-7 max-w-7xl mx-auto w-full">
      <a
        :href="hero.creditUrl" target="_blank" rel="noopener noreferrer"
        class="text-[0.625rem] text-white/35 hover:text-white/70"
      >
        Foto: {{ hero.credit }}
      </a>

      <span aria-hidden="true" class="hidden sm:flex items-center gap-1.5 text-white/35 text-[0.6875rem]">
        Desliza
        <Icon name="ph:caret-down-bold" class="size-3 nx-scroll-cue" />
      </span>
    </div>
  </div>
</template>

<style scoped>
@keyframes nx-scroll-cue {
  0%, 100% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(4px); opacity: 1; }
}
.nx-scroll-cue {
  animation: nx-scroll-cue 1.8s ease-in-out infinite;
}
</style>

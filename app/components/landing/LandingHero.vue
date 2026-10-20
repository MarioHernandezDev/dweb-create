<script setup lang="ts">
const heroImageSrc = '/img/hero.jpg'
const brandLetters = 'FEEDMA'.split('')
const isLoading = ref(true)
const titleReady = ref(false)

// Lectura de "cámara grabando" puramente ambiental — un guiño de parte de
// rodaje, no un dato real. Arranca en un instante creíble en vez de 00:00:00.
const elapsed = ref(427)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  const startedAt = performance.now()
  timer = setInterval(() => (elapsed.value += 1), 1000)
  const logo = new Image()
  logo.src = '/img/logo-svg.png'
  const heroImage = new Image()
  heroImage.src = heroImageSrc
  await Promise.race([
    Promise.allSettled([document.fonts.ready, logo.decode(), heroImage.decode()]),
    new Promise((resolve) => setTimeout(resolve, 1500))
  ])
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, 900 - (performance.now() - startedAt))))
  isLoading.value = false
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
  <div class="relative min-h-[120dvh] overflow-hidden flex flex-col" :class="{ 'nx-feedma-ready': titleReady }">
    <Transition name="nx-preloader" @after-leave="titleReady = true">
      <div
        v-if="isLoading"
        role="status"
        aria-label="Cargando FEEDMA"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0812]"
      >
        <img src="/img/logo-svg.png" alt="FEEDMA" class="nx-preloader-logo size-40 sm:size-48" width="512" height="512">
        <span class="nx-preloader-bar mt-8" aria-hidden="true" />
      </div>
    </Transition>

    <!-- Base sólida siempre visible, independiente de si la foto ya ha
         cargado: el contraste del texto nunca depende de una descarga de red. -->
    <div class="absolute inset-0 " />

    <NuxtImg
      :src="heroImageSrc" alt="" aria-hidden="true" fit="cover" :width="1920" :height="1200"
      :quality="82" format="webp" loading="eager" fetchpriority="high"
      class="absolute inset-0 size-full object-cover object-center"
    />

    <!-- Scrim propio (no el de CoverImage): más oscuro de base para que el
         texto blanco tenga contraste suficiente encima de cualquier foto. -->
    <div
      class="absolute inset-0"
      style="background: linear-gradient(195deg, rgb(8 6 18 / 25%) 0%, rgb(8 6 18 / 48%) 45%, rgb(8 6 18 / 72%) 100%)"
    />

    <!-- Mancha ambiental: el único movimiento permanente de la app -->
    <div
      aria-hidden="true"
      class="absolute -top-40 -right-40 size-[34rem] md:size-[46rem] rounded-full blur-[110px] opacity-[0.35] nx-hero-blob"
      style="background: radial-gradient(circle, var(--color-logo-teal), var(--color-primary-500) 55%, transparent 72%)"
    />

    <main class="relative z-10 flex-1 flex flex-col justify-center w-full pb-10 pt-24 md:pt-16">
      

      <h1
        aria-label="FEEDMA"
        class="nx-feedma-shimmer nx-feedma-title grid w-full grid-cols-6 px-5 font-display font-light leading-[0.8] text-[clamp(2.5rem,18vw,24rem)] mb-1 md:px-10 md:mb-2 lg:px-16"
      >
        <span
          v-for="(letter, index) in brandLetters"
          :key="index"
          aria-hidden="true"
          class="nx-feedma-letter"
          :style="{ '--letter-delay': `${index * 120}ms` }"
        >{{ letter }}</span>
      </h1>

      <div class="mx-auto w-full max-w-7xl px-5 md:px-10 lg:px-16">
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
      </div>
    </main>

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

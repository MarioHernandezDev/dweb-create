<script setup lang="ts">
import { coverPhotos } from '~/utils/images'

useHead({ title: 'Estudio de contenido' })

const hero = coverPhotos.landing
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-ink)]">
    <header class="flex items-center gap-2.5 px-5 py-5 md:px-10 md:py-6 max-w-xl mx-auto">
      <NuxtImg src="/img/logo-svg.png" alt="" width="32" height="32" class="size-8" />
      <span class="font-display text-[1.125rem] text-[var(--color-text)]">FEEDMA</span>
    </header>

    <main class="max-w-xl mx-auto px-4 md:px-10 pb-12">
      <!-- Hero: la foto manda, el titular vive encima en el borde inferior —
           patrón de apertura de app móvil, no una franja de texto separada. -->
      <section class="relative rounded-[var(--radius-lg)] overflow-hidden h-[60vh] max-h-[560px] min-h-[380px]">
        <CoverImage :photo="hero" :width="900" :height="1200" scrim="full" class="absolute inset-0" />
        <div class="relative h-full flex flex-col justify-end p-6 md:p-9">
          <h1 class="font-display text-white text-[2.1rem] md:text-[2.5rem] leading-[1.08] max-w-[18ch]">
            El parte de rodaje de tu contenido.
          </h1>
          <p class="mt-3 text-white/75 text-[0.9375rem] leading-relaxed max-w-[34ch]">
            Entregas, métricas y predicciones de éxito, todo en un solo sitio.
          </p>
        </div>
        <a
          :href="hero.creditUrl" target="_blank" rel="noopener noreferrer"
          class="absolute top-3 right-3 text-[0.625rem] text-white/50 hover:text-white/80"
        >
          Foto: {{ hero.credit }}
        </a>
      </section>

      <section class="mt-8">
        <BaseButton to="/login" variant="primary" size="lg" icon="ph:arrow-right-bold" class="w-full">
          Acceder a tu cuenta
        </BaseButton>
      </section>

      <p class="mt-6 text-[0.8125rem] text-[var(--color-text-faint)] text-center">
        ¿No tienes cuenta todavía? <NuxtLink to="/onboarding" class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2">Mira cómo sería el registro</NuxtLink>
      </p>
    </main>
  </div>
</template>

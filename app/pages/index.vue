<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { coverPhotos } from '~/utils/images'
import type { Role } from '~/types'

useHead({ title: 'Estudio de contenido' })

const roles: Role[] = ['manager', 'creator', 'client']
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
        <p class="text-[0.9375rem] text-[var(--color-text-muted)] mb-4">Elige cómo quieres entrar</p>
        <div class="flex flex-col gap-3">
          <NuxtLink
            v-for="role in roles" :key="role" :to="roleMeta[role].home"
            class="group block"
          >
            <BaseCard radius="lg" padding="lg" interactive class="flex items-center gap-4">
              <span class="flex items-center justify-center size-12 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] shrink-0">
                <Icon :name="roleMeta[role].icon" class="size-5" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="font-display text-[1.1875rem] text-[var(--color-text)]">{{ roleMeta[role].label }}</p>
                <p class="mt-0.5 text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed">{{ roleMeta[role].description }}</p>
              </div>
              <Icon name="ph:arrow-right-bold" class="size-4 shrink-0 text-[var(--color-text-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-primary-500)]" />
            </BaseCard>
          </NuxtLink>
        </div>
      </section>

      <p class="mt-8 text-[0.8125rem] text-[var(--color-text-faint)] text-center">
        Vista previa interna con datos de ejemplo — todavía sin inicio de sesión ni conexión a redes reales.
      </p>
    </main>
  </div>
</template>

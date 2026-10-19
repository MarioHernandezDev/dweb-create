<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { coverPhotos } from '~/utils/images'
import type { Role } from '~/types'

useHead({ title: 'Estudio de contenido' })

const roles: Role[] = ['manager', 'creator', 'client']
const hero = coverPhotos.landing
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <header class="flex items-center justify-between px-6 py-6 md:px-10 md:py-8">
      <div class="flex items-center gap-2.5">
        <span class="flex items-center justify-center size-8 rounded-[0.625rem] bg-[var(--color-flame-500)] text-[var(--color-on-flame)]">
          <Icon name="ph:flame-fill" class="size-4.5" />
        </span>
        <span class="font-display text-[1.125rem]">dweb-create</span>
      </div>
      <ThemeToggle />
    </header>

    <main class="flex-1 flex items-center">
      <div class="w-full max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14 grid md:grid-cols-[1.05fr_0.95fr] gap-10 md:gap-14 items-center">
        <div class="order-2 md:order-1">
          <div class="max-w-[42ch]">
            <h1 class="font-display text-[2.5rem] md:text-[3.5rem] leading-[1.05] text-[var(--color-text)]">
              El parte de rodaje de tu contenido.
            </h1>
            <p class="mt-5 text-[1.0625rem] text-[var(--color-text-muted)] leading-relaxed max-w-[38ch]">
              Lleva las entregas de cada cliente o cada red, consolida tus métricas y predice qué publicación va a funcionar antes de subirla.
            </p>
          </div>

          <div class="mt-12">
            <p class="text-[0.9375rem] text-[var(--color-text-muted)] mb-4">Elige cómo quieres entrar</p>
            <div class="grid gap-3.5 sm:grid-cols-3">
              <NuxtLink
                v-for="role in roles" :key="role" :to="roleMeta[role].home"
                class="group block"
              >
                <BaseCard radius="lg" padding="lg" interactive class="h-full flex flex-col">
                  <span class="flex items-center justify-center size-11 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-flame-500)] mb-5">
                    <Icon :name="roleMeta[role].icon" class="size-5" />
                  </span>
                  <p class="font-display text-[1.1875rem] text-[var(--color-text)]">{{ roleMeta[role].label }}</p>
                  <p class="mt-1.5 text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed flex-1">{{ roleMeta[role].description }}</p>
                  <span class="mt-5 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-[var(--color-text)] group-hover:text-[var(--color-flame-500)] transition-colors">
                    Entrar
                    <Icon name="ph:arrow-right-bold" class="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </BaseCard>
              </NuxtLink>
            </div>
          </div>

          <p class="mt-10 text-[0.8125rem] text-[var(--color-text-faint)]">
            Vista previa interna con datos de ejemplo — todavía sin inicio de sesión ni conexión a redes reales.
          </p>
        </div>

        <div class="order-1 md:order-2">
          <CoverImage
            :photo="hero" :width="900" :height="1100" scrim="tint"
            class="rounded-[var(--radius-lg)] border border-[var(--color-hairline)] aspect-[4/3] md:aspect-[3/4] md:h-[560px]"
          />
          <a
            :href="hero.creditUrl" target="_blank" rel="noopener noreferrer"
            class="mt-2 block text-[0.6875rem] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] text-right"
          >
            Foto: {{ hero.credit }} en Unsplash
          </a>
        </div>
      </div>
    </main>
  </div>
</template>

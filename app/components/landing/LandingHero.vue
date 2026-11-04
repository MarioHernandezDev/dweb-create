<script setup lang="ts">
import type { PostStatus } from '~/types'

const phases: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']
</script>

<template>
  <section class="hero">
    <div class="container">
      <div class="hero__grid">
        <div>
          <h1 class="hero__title">
            Creadores y marcas, de la primera oferta a la <span class="hero__accent">última métrica</span>.
          </h1>
          <p class="hero__lead">
            Encuentra con quién colaborar, acordad las condiciones, gestionad las entregas y medid el resultado, todo en un mismo sitio.
          </p>
          <div class="hero__cta">
            <BaseButton to="/onboarding" variant="brand" size="lg" icon="ph:arrow-right-bold">Crear cuenta</BaseButton>
            <NuxtLink to="/login" class="hero__login">Ya tengo cuenta</NuxtLink>
          </div>
        </div>

        <div class="hero__art" aria-hidden="true">
          <WaveMotif class="hero__waves" />
          <AnimatedMark class="hero__mark" />
        </div>
      </div>

      <div class="hero__phases">
        <p class="hero__phases-label">Cada entrega pasa por</p>
        <template v-for="(phase, i) in phases" :key="phase">
          <PhaseChip :status="phase" />
          <Icon v-if="i < phases.length - 1" name="ph:caret-right-bold" class="hero__phases-arrow" />
        </template>
      </div>
    </div>
  </section>
</template>

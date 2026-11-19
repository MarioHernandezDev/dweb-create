<script setup lang="ts">
import { legal, legalHasPlaceholders } from '~/utils/legal'

defineProps<{ title: string; intro: string }>()
</script>

<template>
  <div class="legal">
    <LandingNav />

    <main class="container legal__main">
      <p class="text-sm text-[var(--text-muted)] mb-2">
        Última actualización: <LegalValue :value="legal.lastUpdated" />
      </p>
      <h1 class="page-header__title legal__title">{{ title }}</h1>
      <p class="legal__intro">{{ intro }}</p>

      <BaseCard v-if="legalHasPlaceholders" tint="mantequilla" padding="sm" role="note" class="mb-10 text-sm">
        <strong>Borrador pendiente de completar.</strong>
        Los datos marcados en amarillo aún no están rellenados y el texto debe revisarlo un profesional antes de usarse con usuarios reales. Se completan en <code>app/utils/legal.ts</code>.
      </BaseCard>

      <article class="prose-legal">
        <slot />
      </article>

      <nav aria-label="Documentos legales" class="legal__nav">
        <NuxtLink to="/privacidad">Política de privacidad</NuxtLink>
        <NuxtLink to="/terminos">Términos y condiciones</NuxtLink>
        <NuxtLink to="/">Volver al inicio</NuxtLink>
      </nav>
    </main>

    <LandingFooter />
  </div>
</template>

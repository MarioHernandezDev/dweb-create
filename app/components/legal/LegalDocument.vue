<script setup lang="ts">
import { legal, legalHasPlaceholders } from '~/utils/legal'

defineProps<{ title: string; intro: string }>()
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-ink)] pt-16 md:pt-[4.5rem]">
    <LandingNav />

    <main class="max-w-3xl mx-auto px-5 md:px-10 py-12 md:py-16">
      <p class="text-[0.8125rem] text-[var(--color-text-faint)] mb-2">
        Última actualización: <LegalValue :value="legal.lastUpdated" />
      </p>
      <h1 class="font-display text-[2rem] md:text-[2.75rem] leading-[1.1] text-[var(--color-text)] mb-4">{{ title }}</h1>
      <p class="text-[1rem] text-[var(--color-text-muted)] leading-relaxed mb-8">{{ intro }}</p>

      <div
        v-if="legalHasPlaceholders" role="note"
        class="mb-10 rounded-[var(--radius-sm)] border border-[var(--color-logo-amber)]/60 bg-[var(--color-logo-amber)]/15 px-4 py-3 text-[0.875rem] text-[var(--color-text)]"
      >
        <strong>Borrador pendiente de completar.</strong>
        Los datos marcados en amarillo aún no están rellenados y el texto debe revisarlo un profesional antes de usarse con usuarios reales. Se completan en <code>app/utils/legal.ts</code>.
      </div>

      <article class="legal-prose">
        <slot />
      </article>

      <nav aria-label="Documentos legales" class="mt-14 pt-6 border-t border-[var(--color-hairline)] flex flex-wrap gap-x-6 gap-y-2 text-[0.875rem]">
        <NuxtLink to="/privacidad" class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2">Política de privacidad</NuxtLink>
        <NuxtLink to="/terminos" class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2">Términos y condiciones</NuxtLink>
        <NuxtLink to="/" class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2">Volver al inicio</NuxtLink>
      </nav>
    </main>

    <LandingFooter />
  </div>
</template>

<style scoped>
.legal-prose :deep(h2) {
  font-family: var(--font-display);
  font-size: 1.375rem;
  line-height: 1.25;
  color: var(--color-text);
  margin: 2.25rem 0 0.75rem;
}
.legal-prose :deep(p),
.legal-prose :deep(li) {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-text-muted);
}
.legal-prose :deep(p) { margin: 0 0 0.875rem; }
.legal-prose :deep(ul) { margin: 0 0 0.875rem; padding-left: 1.25rem; list-style: disc; }
.legal-prose :deep(li) { margin-bottom: 0.375rem; }
.legal-prose :deep(strong) { color: var(--color-text); font-weight: 600; }
.legal-prose :deep(a) { text-decoration: underline; text-underline-offset: 2px; color: var(--color-primary-600); }
</style>

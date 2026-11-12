<script setup lang="ts">
import type { Suggestion } from '~/types'

const props = defineProps<{ score: number; aiEvaluated?: boolean; suggestions: Suggestion[]; genericSuggestions?: boolean }>()

const kindMeta: Record<Suggestion['kind'], { icon: string; label: string }> = {
  caption: { icon: 'ph:pencil-simple-fill', label: 'Mejora de texto' },
  hashtag: { icon: 'ph:hash-fill', label: 'Hashtag' },
  schedule: { icon: 'ph:clock-fill', label: 'Horario' }
}

const scoreWord = computed(() => (props.score < 45 ? 'bajo' : props.score < 72 ? 'medio' : 'alto'))
</script>

<template>
  <BaseCard radius="lg" padding="lg" tone="overlay" class="relative overflow-hidden">
    <div class="absolute -right-10 -top-16 size-48 rounded-full bg-[var(--color-signal-500)] opacity-[0.12] blur-2xl" aria-hidden="true" />

    <div class="relative flex items-start gap-5">
      <ProgressRing :value="score" :size="88" :stroke="8" />
      <div class="min-w-0 pt-1">
        <p class="inline-flex items-center gap-1.5 text-micro font-medium text-[var(--color-signal-500)]">
          <Icon name="ph:sparkle-fill" class="size-3.5" />
          Predicción de éxito
        </p>
        <p class="mt-1 text-base text-[var(--color-text)]">
          Potencial <strong class="font-semibold">{{ scoreWord }}</strong>
        </p>
        <!-- Honesto sobre qué se evaluó de verdad — nada de un "% de confianza"
             inventado ni de afirmar que se mira tu historial o tendencias, que
             nunca ha sido cierto (ver server/api/ml/predict.post.ts). -->
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">
          {{ aiEvaluated ? 'Evaluado con IA sobre el contenido real de este borrador.' : 'Evaluado solo por la forma del borrador (longitud, hashtags) — sin IA disponible ahora mismo.' }}
        </p>
      </div>
    </div>

    <p v-if="genericSuggestions" class="relative mt-6 inline-flex items-center gap-1.5 text-micro font-medium text-[var(--color-text-faint)]">
      <Icon name="ph:info-fill" class="size-3.5" />
      Consejos generales — no son un análisis de esta publicación en concreto
    </p>
    <ul class="relative flex flex-col gap-3" :class="genericSuggestions ? 'mt-2' : 'mt-6'">
      <li v-for="(s, i) in suggestions" :key="i" class="flex items-start gap-3">
        <span class="flex items-center justify-center size-7 rounded-full bg-[var(--color-ink-raised)] text-[var(--color-text-muted)] shrink-0 mt-0.5">
          <Icon :name="kindMeta[s.kind].icon" class="size-3.5" />
        </span>
        <p class="text-sm text-[var(--color-text)] leading-relaxed">{{ s.text }}</p>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
import { coverArtFromString } from '~/utils/avatar'

/**
 * Panel destacado del home — mismo lenguaje visual que ProfileHeaderCard/
 * FeaturedDeck (imagen o degradado por semilla + scrim + texto blanco
 * encima), pero pensado para ser EL protagonista de la composición, no una
 * tarjeta más: altura generosa, un único CTA claro. El contenido (qué se
 * muestra aquí) lo decide cada página según el estado real de sus datos —
 * este componente es puramente presentacional.
 */
const props = defineProps<{
  coverUrl?: string | null
  /** Semilla estable para el degradado cuando no hay foto (id de la colaboración/post/perfil implicado). */
  coverSeed: string
  icon: string
  eyebrow: string
  title: string
  description?: string | null
  ctaLabel: string
  /** Si la acción no es una ruta (p. ej. abrir una hoja inferior), se omite y el botón emite `cta-click`. */
  ctaTo?: string
}>()

defineEmits<{ 'cta-click': [] }>()

const coverArt = computed(() => coverArtFromString(props.coverSeed))
</script>

<template>
  <div class="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-hairline)] bg-[var(--color-paper)]">
    <div class="relative h-56 md:h-64">
      <img v-if="coverUrl" :src="coverUrl" alt="" class="absolute inset-0 size-full object-cover">
      <div
        v-else class="absolute inset-0 flex items-center justify-center"
        :style="{ background: `linear-gradient(${coverArt.angle}deg, ${coverArt.from}, ${coverArt.to})` }"
      >
        <Icon :name="icon" class="size-16 text-white/20" />
      </div>

      <span class="absolute inset-x-0 bottom-0 h-3/4" style="background: linear-gradient(to top, rgb(10 9 12 / 88%) 10%, rgb(10 9 12 / 0%) 100%)" />

      <div class="absolute inset-x-0 bottom-0 p-5 md:p-7">
        <span class="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[0.6875rem] font-semibold uppercase tracking-wide bg-white/15 text-white backdrop-blur-sm mb-2.5">
          <Icon :name="icon" class="size-3" />
          {{ eyebrow }}
        </span>
        <h2 class="font-display text-[1.5rem] md:text-[1.875rem] leading-[1.12] text-white" style="text-shadow: 0 1px 10px rgba(0,0,0,0.35)">
          {{ title }}
        </h2>
      </div>
    </div>

    <div class="p-5 md:p-6 flex items-center justify-between gap-4">
      <p v-if="description" class="min-w-0 flex-1 text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed line-clamp-2">{{ description }}</p>
      <BaseButton variant="primary" size="md" icon="ph:arrow-right-bold" class="shrink-0" :to="ctaTo" @click="!ctaTo && $emit('cta-click')">{{ ctaLabel }}</BaseButton>
    </div>
  </div>
</template>

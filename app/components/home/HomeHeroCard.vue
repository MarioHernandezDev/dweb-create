<script setup lang="ts">
/**
 * Bloque destacado de «Hoy»: el protagonista de la pantalla, uno solo. El
 * contenido (qué se muestra) lo decide cada página según el estado real de sus
 * datos; este componente es puramente presentacional. Con foto, la foto va a
 * un lado; sin ella, el motivo de ondas de la marca.
 */
defineProps<{
  coverUrl?: string | null
  icon: string
  eyebrow: string
  title: string
  description?: string | null
  ctaLabel: string
  /** Si la acción no es una ruta (p. ej. abrir una hoja inferior), se omite y el botón emite `cta-click`. */
  ctaTo?: string
}>()

defineEmits<{ 'cta-click': [] }>()
</script>

<template>
  <BaseCard variant="featured" padding="none" class="home-hero" :class="coverUrl && 'home-hero--photo'">
    <img v-if="coverUrl" :src="coverUrl" alt="" class="home-hero__photo">
    <WaveMotif v-else class="home-hero__waves" />

    <div class="home-hero__body">
      <span class="chip chip--sm chip--inverse self-start"><Icon :name="icon" class="chip__icon" />{{ eyebrow }}</span>
      <h2 class="home-hero__title">{{ title }}</h2>
      <p v-if="description" class="home-hero__desc">{{ description }}</p>
      <BaseButton variant="brand" size="md" icon="ph:arrow-right-bold" :to="ctaTo" class="self-start mt-2" @click="!ctaTo && $emit('cta-click')">{{ ctaLabel }}</BaseButton>
    </div>
  </BaseCard>
</template>

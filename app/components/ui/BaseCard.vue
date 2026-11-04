<script setup lang="ts">
/**
 * Tarjeta. Aspecto en assets/css/components/card.css. `tone="overlay"`,
 * `radius` y `padding` se mantienen con sus valores de siempre; `variant` y
 * `tint` son las novedades (propuesta §3.6).
 */
withDefaults(
  defineProps<{
    tone?: 'raised' | 'overlay'
    radius?: 'sm' | 'md' | 'lg'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    variant?: 'info' | 'featured'
    tint?: 'voltio' | 'mantequilla' | 'menta' | 'cielo' | 'rosa'
    interactive?: boolean
  }>(),
  { tone: 'raised', radius: 'md', padding: 'md', variant: 'info', interactive: false }
)
</script>

<template>
  <div
    class="card"
    :class="[
      tone === 'overlay' && 'card--sunken',
      radius !== 'md' && `card--r-${radius}`,
      padding === 'md' ? undefined : `card--pad-${padding}`,
      variant === 'featured' && 'card--featured',
      tint && `card--tint-${tint}`,
      interactive && 'card--interactive'
    ]"
  >
    <slot />
  </div>
</template>

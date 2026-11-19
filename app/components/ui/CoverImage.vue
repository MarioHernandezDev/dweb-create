<script setup lang="ts">
import type { CoverPhoto } from '~/utils/images'

withDefaults(
  defineProps<{
    photo: CoverPhoto
    width: number
    height: number
    scrim?: 'bottom' | 'full' | 'tint' | 'none'
  }>(),
  { scrim: 'bottom' }
)
</script>

<template>
  <div class="relative overflow-hidden">
    <NuxtImg
      v-if="photo.id"
      provider="unsplash" :src="photo.id" :alt="photo.alt" fit="crop" :width="width" :height="height"
      :quality="80" format="webp" class="absolute inset-0 size-full object-cover"
    />
    <NuxtImg
      v-else
      :src="photo.src" :alt="photo.alt" fit="cover" :width="width" :height="height"
      :quality="80" format="webp" class="absolute inset-0 size-full object-cover"
    />
    <!-- "bottom"/"full" usan un negro fijo (no el --color-ink del tema) porque el texto
         que va encima siempre es claro, en modo claro u oscuro de la app. -->
    <div
      v-if="scrim === 'bottom'" class="absolute inset-0"
      style="background: linear-gradient(185deg, rgb(10 9 12 / 8%) 0%, rgb(10 9 12 / 90%) 100%)"
    />
    <div
      v-else-if="scrim === 'full'" class="absolute inset-0"
      style="background: linear-gradient(140deg, rgb(10 9 12 / 80%) 0%, rgb(10 9 12 / 48%) 60%, color-mix(in oklab, var(--color-primary-600) 45%, rgb(10 9 12 / 40%)) 130%)"
    />
    <div
      v-else-if="scrim === 'tint'" class="absolute inset-0 mix-blend-multiply"
      style="background: linear-gradient(135deg, color-mix(in oklab, var(--color-primary-600) 22%, transparent) 0%, transparent 55%)"
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { localPhotos } from '~/utils/images'

const banner = localPhotos.install
</script>

<template>
  <div class="relative min-h-[26rem] md:min-h-[30rem] overflow-hidden flex flex-col">
    <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-900)] via-[#150c34] to-[#0a0812]" />

    <NuxtImg
      :src="banner.src" :alt="banner.alt" fit="cover" :width="1600" :height="1000"
      :quality="78" format="webp" class="absolute inset-0 size-full object-cover opacity-40"
    />
    <div
      class="absolute inset-0"
      style="background: linear-gradient(195deg, rgb(8 6 18 / 55%) 0%, rgb(8 6 18 / 80%) 55%, rgb(8 6 18 / 94%) 100%)"
    />

    <div class="relative z-10 flex-1 flex flex-col justify-end px-5 md:px-10 lg:px-16 pb-14 pt-28 max-w-7xl mx-auto w-full">
      <p class="text-[0.8125rem] font-medium text-[var(--color-logo-teal)] mb-3">Instalaciones</p>
      <h1 class="font-display font-light text-white text-[clamp(2.25rem,6vw,4rem)] leading-[1.05] max-w-[18ch] mb-4">
        Llévate FEEDMA contigo.
      </h1>
      <p class="text-white/65 text-[0.9375rem] md:text-[1.0625rem] leading-relaxed max-w-[46ch]">
        Instálala en tu móvil como una app y conecta tus redes para que las métricas lleguen solas.
      </p>
    </div>
  </div>
</template>

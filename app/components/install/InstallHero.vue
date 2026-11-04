<script setup lang="ts">
import { localPhotos } from '~/utils/images'

const banner = localPhotos.install
</script>

<template>
  <div class="relative min-h-[26rem] md:min-h-[30rem] overflow-hidden flex flex-col">
    <div class="absolute inset-0 bg-[var(--surface-inverse)]" />

    <NuxtImg
      :src="banner.src" :alt="banner.alt" fit="cover" :width="1600" :height="1000"
      :quality="78" format="webp" class="absolute inset-0 size-full object-cover opacity-40"
    />
    <div
      class="absolute inset-0"
      style="background: linear-gradient(195deg, rgb(8 6 18 / 55%) 0%, rgb(8 6 18 / 80%) 55%, rgb(8 6 18 / 94%) 100%)"
    />

    <svg aria-hidden="true" class="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 500" preserveAspectRatio="none">
      <defs>
        <symbol id="nx-ant-install" viewBox="0 0 20 12">
          <g fill="none" stroke="var(--color-logo-amber)" stroke-width="1" stroke-linecap="round">
            <path d="M9 7 L6 10.5 M9 7 L7 3 M12 7 L13 10.5 M12 7 L13 3" />
            <path d="M15.5 4.8 L18.5 3 M15.5 5.6 L18.8 6.2" />
          </g>
          <ellipse cx="5" cy="6" rx="3.6" ry="3" fill="var(--color-logo-amber)" />
          <ellipse cx="10.3" cy="6" rx="2.3" ry="2.1" fill="var(--color-logo-amber)" />
          <ellipse cx="14.6" cy="6" rx="1.9" ry="1.9" fill="var(--color-logo-amber)" />
        </symbol>
      </defs>

      <path
        d="M -40 170 C 140 130, 260 210, 440 175 S 760 120, 900 170 S 1100 210, 1240 160"
        fill="none" stroke="rgb(255 255 255 / 10%)" stroke-width="2.5" stroke-linecap="round"
        stroke-dasharray="1 13"
      />

      <use href="#nx-ant-install" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: 0s" />
      <use href="#nx-ant-install" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: -10s" />
    </svg>

    <div class="relative z-10 flex-1 flex flex-col justify-end px-5 md:px-10 lg:px-16 pb-14 pt-28 max-w-7xl mx-auto w-full">
      <p class="text-[0.8125rem] font-medium text-[var(--color-logo-teal)] mb-3">Integraciones</p>
      <h1 class="font-display font-light text-white text-[clamp(2.25rem,6vw,4rem)] leading-[1.05] max-w-[18ch] mb-4">
        Llévate CIBERAN contigo.
      </h1>
      <p class="text-white/65 text-[0.9375rem] md:text-[1.0625rem] leading-relaxed max-w-[46ch]">
        Instálala en tu móvil como una app y conecta tus redes para que las métricas lleguen solas.
      </p>
    </div>
  </div>
</template>

<style scoped>
.nx-ant {
  offset-path: path('M -40 170 C 140 130, 260 210, 440 175 S 760 120, 900 170 S 1100 210, 1240 160');
  offset-rotate: auto;
  animation: nx-ant-walk 20s linear infinite;
}

@keyframes nx-ant-walk {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .nx-ant {
    animation: none;
    offset-distance: 0%;
  }
}
</style>

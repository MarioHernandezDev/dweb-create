<script setup lang="ts"></script>

<template>
  <div class="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white px-5 pt-24 pb-16 text-center md:pt-16">

    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10"
      style="background: radial-gradient(55% 45% at 50% 22%, var(--color-primary-200) 0%, transparent 70%); opacity: 0.4"
    />

    <svg aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1200 500" preserveAspectRatio="none">
      <defs>
        <symbol id="nx-ant" viewBox="0 0 20 12">
          <g fill="none" stroke="var(--color-primary-600)" stroke-width="1" stroke-linecap="round">
            <path d="M9 7 L6 10.5 M9 7 L7 3 M12 7 L13 10.5 M12 7 L13 3" />
            <path d="M15.5 4.8 L18.5 3 M15.5 5.6 L18.8 6.2" />
          </g>
          <ellipse cx="5" cy="6" rx="3.6" ry="3" fill="var(--color-primary-500)" />
          <ellipse cx="10.3" cy="6" rx="2.3" ry="2.1" fill="var(--color-primary-500)" />
          <ellipse cx="14.6" cy="6" rx="1.9" ry="1.9" fill="var(--color-primary-500)" />
        </symbol>
      </defs>

      <path
        d="M -40 260 C 160 200, 260 310, 420 260 S 680 170, 820 250 S 1080 310, 1240 240"
        fill="none" stroke="var(--color-logo-amber)" stroke-width="3" stroke-linecap="round"
        stroke-dasharray="1 14" opacity="0.55"
      />

      <use href="#nx-ant" class="nx-ant" width="26" height="16" transform="translate(-13 -8)" style="animation-delay: 0s" />
      <use href="#nx-ant" class="nx-ant" width="26" height="16" transform="translate(-13 -8)" style="animation-delay: -5.2s" />
      <use href="#nx-ant" class="nx-ant" width="26" height="16" transform="translate(-13 -8)" style="animation-delay: -10.4s" />
      <use href="#nx-ant" class="nx-ant" width="26" height="16" transform="translate(-13 -8)" style="animation-delay: -15.6s" />
      <use href="#nx-ant" class="nx-ant" width="26" height="16" transform="translate(-13 -8)" style="animation-delay: -20.8s" />
    </svg>

    <svg aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.05] mix-blend-multiply">
      <filter id="nx-hero-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#nx-hero-grain)" />
    </svg>

    <h1
      class="nx-stagger-in font-display font-light leading-[0.85] text-black text-[clamp(3.5rem,16vw,15rem)]"
      style="--stagger-i: 1"
    >
      FEEDMA
    </h1>

    <h2
      class="nx-stagger-in font-display text-[var(--color-text)] text-[1.25rem] sm:text-[1.5rem] md:text-[1.75rem] leading-[1.25] max-w-[24ch] mt-5 mb-3"
      style="--stagger-i: 2"
    >
      El parte de rodaje de tu contenido.
    </h2>
    <p
      class="nx-stagger-in text-[var(--color-text-muted)] text-[0.9375rem] md:text-[1.0625rem] leading-relaxed max-w-[40ch] mb-9"
      style="--stagger-i: 2"
    >
      Entregas, métricas y predicciones de éxito — partners y creadores de contenido, todo en un solo sitio.
    </p>

    <div class="nx-stagger-in flex flex-col items-center gap-4 sm:flex-row sm:gap-6" style="--stagger-i: 3">
      <BaseButton to="/login" variant="primary" size="lg" icon="ph:arrow-right-bold" class="w-full sm:w-auto sm:px-10">
        Acceder a tu cuenta
      </BaseButton>
      <NuxtLink to="/onboarding" class="text-[0.875rem] text-[var(--color-text-muted)] underline decoration-[var(--color-hairline-strong)] underline-offset-4 hover:text-[var(--color-text)]">
        Registro personal :)
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.nx-ant {
  offset-path: path('M -40 260 C 160 200, 260 310, 420 260 S 680 170, 820 250 S 1080 310, 1240 240');
  offset-rotate: auto;
  animation: nx-ant-walk 26s linear infinite;
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

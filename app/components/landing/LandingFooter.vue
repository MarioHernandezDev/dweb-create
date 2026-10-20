<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="relative isolate overflow-hidden bg-[var(--color-primary-900)] text-white/70">
    <svg aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
      <defs>
        <symbol id="nx-ant-footer" viewBox="0 0 20 12">
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
        d="M -40 190 C 140 150, 260 230, 440 195 S 760 140, 900 190 S 1100 230, 1240 180"
        fill="none" stroke="rgb(255 255 255 / 18%)" stroke-width="2.5" stroke-linecap="round"
        stroke-dasharray="1 13"
      />

      <use href="#nx-ant-footer" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: 0s" />
      <use href="#nx-ant-footer" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: -8s" />
      <use href="#nx-ant-footer" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: -16s" />
    </svg>

    <div class="max-w-7xl mx-auto px-5 md:px-10 py-14 md:py-16">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="col-span-2 md:col-span-1 pr-6">
          <div class="flex items-center gap-2.5 mb-3.5">
            <NuxtImg src="/img/logo-svg.png" alt="" width="24" height="24" class="size-6" />
            <span class="font-display text-[1.0625rem] text-white">FEEDMA</span>
          </div>
          <p class="text-[0.8125rem] leading-relaxed max-w-[26ch] text-white/50">
            El parte de rodaje de tu contenido — entregas, métricas y predicciones en un solo sitio.
          </p>
        </div>

        <div>
          <p class="text-[0.75rem] font-medium text-white/40 mb-3.5">Producto</p>
          <ul class="flex flex-col gap-2.5 text-[0.8125rem]">
            <li><NuxtLink to="/#rodaje" class="hover:text-white transition-colors">Cómo funciona</NuxtLink></li>
            <li><NuxtLink to="/#equipo" class="hover:text-white transition-colors">Para quién es</NuxtLink></li>
            <li><NuxtLink to="/instalaciones" class="hover:text-white transition-colors">Instalaciones</NuxtLink></li>
          </ul>
        </div>

        <div>
          <p class="text-[0.75rem] font-medium text-white/40 mb-3.5">Cuenta</p>
          <ul class="flex flex-col gap-2.5 text-[0.8125rem]">
            <li><NuxtLink to="/login" class="hover:text-white transition-colors">Acceder</NuxtLink></li>
            <li><NuxtLink to="/onboarding" class="hover:text-white transition-colors">Crear cuenta</NuxtLink></li>
          </ul>
        </div>

        <div>
          <p class="text-[0.75rem] font-medium text-white/40 mb-3.5">Redes que conecta</p>
          <ul class="flex flex-col gap-2.5 text-[0.8125rem]">
            <li>Instagram · TikTok · YouTube</li>
            <li>X · Facebook · LinkedIn</li>
          </ul>
        </div>
      </div>

      <div class="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p class="text-[0.75rem] text-white/35">© {{ year }} FEEDMA. Hecho para equipos de contenido.</p>
        <p class="text-[0.75rem] text-white/35">Fotografía de portada: Unsplash License</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.nx-ant {
  offset-path: path('M -40 190 C 140 150, 260 230, 440 195 S 760 140, 900 190 S 1100 230, 1240 180');
  offset-rotate: auto;
  animation: nx-ant-walk 24s linear infinite;
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

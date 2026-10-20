<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="relative bg-[var(--color-primary-900)] text-white/70">
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

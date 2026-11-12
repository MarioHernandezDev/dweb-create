<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="land-foot">
    <div class="container">
      <div class="land-foot__grid">
        <div class="land-foot__brand">
          <BrandMark tone="light" :size="36" label="" />
          <p class="mt-4 max-w-[30ch] text-sm">Creadores y marcas, de la primera oferta a la última métrica.</p>
        </div>

        <div>
          <p class="land-foot__title">Producto</p>
          <ul class="land-foot__list">
            <li><NuxtLink to="/#fases" class="land-foot__link">Cómo funciona</NuxtLink></li>
            <li><NuxtLink to="/#perfiles" class="land-foot__link">Para quién es</NuxtLink></li>
            <li><NuxtLink to="/instalaciones" class="land-foot__link">Integraciones</NuxtLink></li>
          </ul>
        </div>

        <div>
          <p class="land-foot__title">Cuenta</p>
          <ul class="land-foot__list">
            <li><NuxtLink to="/login" class="land-foot__link">Acceder</NuxtLink></li>
            <li><NuxtLink to="/onboarding" class="land-foot__link">Crear cuenta</NuxtLink></li>
          </ul>
        </div>

        <div>
          <p class="land-foot__title">Redes</p>
          <ul class="land-foot__list">
            <li>Planifica para Instagram, YouTube, TikTok y más</li>
          </ul>
        </div>
      </div>

      <div class="land-foot__bottom">
        <p>© {{ year }} CIBERAN</p>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <NuxtLink to="/privacidad" class="land-foot__link">Privacidad</NuxtLink>
          <NuxtLink to="/terminos" class="land-foot__link">Términos</NuxtLink>
          <span>Fotografías: Unsplash y Pexels</span>
        </div>
      </div>
    </div>
  </footer>
</template>

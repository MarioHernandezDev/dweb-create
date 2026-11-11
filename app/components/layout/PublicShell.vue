<script setup lang="ts">
/**
 * Marco de las páginas que se abren sin sesión desde un enlace compartido (la
 * ficha pública): barra con la marca y las dos puertas de entrada, sin el menú
 * de la aplicación.
 */
</script>

<template>
  <div class="pubshell">
    <header class="pubshell__bar">
      <NuxtLink to="/" aria-label="CIBERAN, inicio" class="pubshell__brand"><BrandMark tone="light" :size="32" label="" /></NuxtLink>
      <div class="pubshell__actions">
        <BaseButton to="/login" variant="outline-inverse" size="sm">Acceder</BaseButton>
        <BaseButton to="/onboarding" variant="brand" size="sm">Crear cuenta</BaseButton>
      </div>
    </header>
    <main class="pubshell__main"><slot /></main>
    <footer class="pubshell__foot">
      <span>Perfil en CIBERAN, donde marcas y creadores acuerdan y gestionan sus colaboraciones.</span>
      <span><NuxtLink to="/privacidad">Privacidad</NuxtLink> · <NuxtLink to="/terminos">Términos</NuxtLink></span>
    </footer>
  </div>
</template>

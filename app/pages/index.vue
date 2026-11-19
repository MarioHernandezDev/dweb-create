<script setup lang="ts">
useHead({ title: 'Creadores y marcas' })
</script>

<template>
  <div>
    <LandingNav />
    <!-- Región principal para lectores de pantalla y «saltar al contenido» (antes la portada no tenía ninguna). -->
    <main id="contenido">
      <LandingHero />
      <LandingPipeline />
      <LandingBento />
      <LandingRoles />
      <LandingCta />
    </main>
    <LandingCompanion />
    <LandingFooter />
  </div>
</template>

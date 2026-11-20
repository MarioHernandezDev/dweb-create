<script setup lang="ts">
useHead({
  title: 'Ayuda y manuales',
  meta: [{ name: 'description', content: 'Manual de usuario y guías rápidas de CIBERAN para creadores y partners, en PDF.' }]
})
</script>

<template>
  <div>
    <LandingNav />
    <section class="hero hero--page">
      <div class="container">
        <div class="hero__grid">
          <div>
            <h1 class="hero__title">Ayuda y manuales.</h1>
            <p class="hero__lead">Aprende a usar CIBERAN en pocos minutos, sea cual sea tu perfil: creador o marca.</p>
            <div class="hero__cta">
              <BaseButton to="#manuales" variant="brand" size="lg" icon="ph:arrow-down-bold">Ver las guías</BaseButton>
            </div>
          </div>
          <div class="hero__art" aria-hidden="true">
            <WaveMotif class="hero__waves" />
            <img src="/img/brand/mark-1024.png" alt="" width="1024" height="1024" class="hero__mark">
          </div>
        </div>
      </div>
    </section>
    <HelpDocs />
    <LandingCta />
    <LandingFooter />
  </div>
</template>

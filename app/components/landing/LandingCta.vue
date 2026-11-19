<template>
  <section class="band band--ink cta" data-companion data-companion-mood="happy" data-companion-tone="dark" data-companion-say="¿Empezamos? Crear la cuenta es gratis.">
    <WaveMotif class="cta__waves" />
    <div class="container">
      <div class="cta__inner reveal">
        <img src="/img/brand/mark-512.png" alt="" width="512" height="512" class="cta__mark" loading="lazy">
        <h2 class="cta__title">Crea tu cuenta y empieza con tu primera colaboración.</h2>
        <p class="band__intro">Entra con tu cuenta o crea una nueva, seas creador o marca.</p>
        <div class="cta__actions">
          <BaseButton to="/onboarding" variant="brand" size="lg" icon="ph:arrow-right-bold">Crear cuenta</BaseButton>
          <BaseButton to="/login" variant="outline-inverse" size="lg">Ya tengo cuenta</BaseButton>
        </div>
      </div>
    </div>
  </section>
</template>

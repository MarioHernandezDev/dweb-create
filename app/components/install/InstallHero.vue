<template>
  <section class="hero hero--page">
    <div class="container">
      <div class="hero__grid">
        <div>
          <h1 class="hero__title">Llévate CIBERAN contigo.</h1>
          <p class="hero__lead">Instálala en tu móvil como una app y conecta tus redes para que las métricas lleguen solas.</p>
          <div class="hero__cta">
            <BaseButton to="#app" variant="brand" size="lg" icon="ph:arrow-down-bold">Cómo instalarla</BaseButton>
            <NuxtLink to="#redes" class="hero__login">Ver redes compatibles</NuxtLink>
          </div>
        </div>
        <div class="hero__art" aria-hidden="true">
          <WaveMotif class="hero__waves" />
          <img src="/img/brand/mark-1024.png" alt="" width="1024" height="1024" class="hero__mark">
        </div>
      </div>
    </div>
  </section>
</template>

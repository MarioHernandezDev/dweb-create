<script setup lang="ts">
/**
 * Marco de acceso y alta: panel de marca (tinta) a la izquierda en escritorio y
 * el formulario a la derecha. En móvil solo el formulario, con el logotipo
 * arriba. El logotipo aparece una sola vez en cada tamaño.
 */
defineProps<{ claim?: string; sub?: string }>()
</script>

<template>
  <div class="auth">
    <aside class="auth__brand">
      <WaveMotif class="auth__waves" />
      <NuxtLink to="/" aria-label="CIBERAN, inicio" class="relative inline-flex">
        <BrandMark tone="light" :size="40" label="" />
      </NuxtLink>
      <div>
        <h2 class="auth__claim">{{ claim ?? 'De la primera oferta a la última métrica.' }}</h2>
        <p class="auth__claim-sub">{{ sub ?? 'Descubre con quién colaborar, acuerda las condiciones y gestiona cada entrega en un solo sitio.' }}</p>
      </div>
      <img src="/img/brand/mark-512.png" alt="" width="512" height="512" class="auth__mark">
    </aside>

    <div class="auth__panel">
      <div class="auth__top">
        <NuxtLink to="/" aria-label="CIBERAN, inicio" class="md:invisible"><BrandMark :size="36" label="" /></NuxtLink>
        <NuxtLink to="/" class="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]">Volver al inicio</NuxtLink>
      </div>
      <main class="auth__main">
        <div class="auth__box"><slot /></div>
      </main>
    </div>
  </div>
</template>

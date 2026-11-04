<script setup lang="ts">
// Reutiliza el mismo indicador que alimenta <NuxtLoadingIndicator> en
// app.vue: "throttle" (200ms por defecto, de Nuxt) evita que esto parpadee
// en navegaciones rápidas — solo aparece si la carga tarda de verdad — y se
// cierra solo en cuanto la navegación termina, también si falla (lo
// gestiona Nuxt; no hay ningún temporizador propio que pueda dejarlo
// colgado). No se alarga artificialmente el tiempo mínimo de aparición: el
// propio throttle ya hace ese trabajo sin añadir espera de más.
const { isLoading } = useLoadingIndicator()
</script>

<template>
  <Transition
    enter-active-class="transition-[opacity,transform] duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0 scale-95"
    leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isLoading" role="status" aria-label="Cargando"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm"
    >
      <!-- La hormiga de marca: recorre una órbita alrededor del propio icono
           de CIBERAN, como si lo inspeccionara — mismo lenguaje visual (trazo
           fino, tono primary-600) que la hormiga que ya camina por el hero
           de la landing (LandingHero.vue), no una animación genérica aparte. -->
      <div class="relative size-28">
        <svg viewBox="0 0 112 112" class="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <symbol id="nx-preloader-ant" viewBox="0 0 20 12">
              <g fill="none" stroke="var(--color-primary-600)" stroke-width="1" stroke-linecap="round">
                <path d="M9 7 L6 10.5 M9 7 L7 3 M12 7 L13 10.5 M12 7 L13 3" />
                <path d="M15.5 4.8 L18.5 3 M15.5 5.6 L18.8 6.2" />
              </g>
              <ellipse cx="5" cy="6" rx="3.6" ry="3" fill="var(--color-primary-500)" />
              <ellipse cx="10.3" cy="6" rx="2.3" ry="2.1" fill="var(--color-primary-500)" />
              <ellipse cx="14.6" cy="6" rx="1.9" ry="1.9" fill="var(--color-primary-500)" />
            </symbol>
          </defs>

          <circle cx="56" cy="56" r="47" fill="none" stroke="var(--color-logo-amber)" stroke-width="2" stroke-dasharray="1 10" stroke-linecap="round" opacity="0.6" />

          <use href="#nx-preloader-ant" width="22" height="13.2" class="nx-preloader-ant-walk" transform="translate(-11 -6.6)" />
        </svg>

        <BrandMark :wordmark="false" :size="52" label="" class="absolute inset-0 m-auto" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.nx-preloader-ant-walk {
  offset-path: circle(47px at 56px 56px);
  offset-rotate: auto;
  animation: nx-preloader-ant-orbit 3.6s linear infinite;
}

@keyframes nx-preloader-ant-orbit {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}
</style>

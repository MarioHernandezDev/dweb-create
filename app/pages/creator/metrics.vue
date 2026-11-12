<script setup lang="ts">
// Apartado PREVISTO, aún sin construir. No lee ni calcula nada: es solo la descripción de lo que llegará
// (ver docs/17-METRICAS-REDES-PROXIMAMENTE.md). Ninguna otra pantalla depende de él.
useHead({ title: 'Métricas de redes · Próximamente' })

const upcoming = [
  { icon: 'ph:users-three-bold', title: 'Audiencia', text: 'Seguidores o suscriptores de cada red conectada y cómo evolucionan semana a semana.' },
  { icon: 'ph:chart-line-up-bold', title: 'Rendimiento de tus publicaciones', text: 'Alcance, vistas, likes, comentarios y engagement de cada contenido, y la media por red.' },
  { icon: 'ph:calendar-check-bold', title: 'Evolución en el tiempo', text: 'Periodos a elegir, comparación con el periodo anterior y tus mejores contenidos.' },
  { icon: 'ph:handshake-bold', title: 'Resultados de tus colaboraciones', text: 'Cómo rindió en cada red el contenido que publicaste con cada marca.' }
]
</script>

<template>
  <AppShell role="creator" title="Métricas de redes" subtitle="Próximamente" full-width>
    <div class="soon">
      <BaseCard radius="lg" padding="lg" class="soon__hero">
        <span class="soon-tag soon__tag">Próximamente</span>
        <h2 class="soon__title">Las métricas de tus redes llegarán en una próxima fase.</h2>
        <p class="soon__lead">
          Conectarás tus cuentas con permiso de la red y verás en un solo sitio cómo funciona tu contenido.
          Hasta entonces, en <NuxtLink to="/creator/insights" class="soon__link">Resultados</NuxtLink> tienes cómo van tus colaboraciones dentro de Ciberan.
        </p>
      </BaseCard>

      <ul class="soon__list" aria-label="Qué incluirá">
        <li v-for="u in upcoming" :key="u.title">
          <BaseCard radius="md" padding="md" class="soon__item">
            <span class="soon__icon"><Icon :name="u.icon" class="size-5" /></span>
            <div>
              <h3 class="soon__item-title">{{ u.title }}</h3>
              <p class="soon__item-text">{{ u.text }}</p>
            </div>
          </BaseCard>
        </li>
      </ul>
    </div>
  </AppShell>
</template>

<style scoped>
.soon { display: grid; gap: 1.25rem; max-width: 56rem; }
.soon__hero { display: grid; gap: 0.75rem; justify-items: start; }
.soon__tag { margin-left: 0; }
.soon__title { font-family: var(--font-display); font-size: var(--text-headline); line-height: var(--text-headline--line-height); font-weight: 800; }
.soon__lead { color: var(--color-tinta-700); max-width: 40rem; }
.soon__link { font-weight: 700; text-decoration: underline; }
.soon__list { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); list-style: none; padding: 0; margin: 0; }
.soon__item { display: flex; gap: 0.875rem; align-items: flex-start; height: 100%; }
.soon__icon { display: grid; place-items: center; flex: none; width: 2.5rem; height: 2.5rem; border-radius: 999px; background: var(--color-voltio-200); }
.soon__item-title { font-weight: 700; }
.soon__item-text { font-size: var(--text-sm); color: var(--color-tinta-500); margin-top: 0.125rem; }
</style>

<script setup lang="ts">
useHead({
  title: 'Ayuda y manuales',
  meta: [{ name: 'description', content: 'Manual de usuario y guías rápidas de CIBERAN para creadores y partners, en PDF.' }]
})

// Pública, pero con sesión se ve dentro del panel (con su menú) en vez de con la cabecera de la portada.
const user = useSupabaseUser()
const { role, ensureRole } = useMyRole()
const shellRole = user.value ? (role.value ?? (await ensureRole())) : null
</script>

<template>
  <AppShell v-if="shellRole" :role="shellRole" title="Ayuda y manuales" subtitle="Aprende a usar CIBERAN en pocos minutos">
    <HelpDocs embedded />
  </AppShell>
  <div v-else>
    <LandingNav />
    <main id="contenido">
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
    </main>
    <LandingFooter />
  </div>
</template>

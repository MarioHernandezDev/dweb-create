<script setup lang="ts">
const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))

// El bloqueo de scroll lo decide el CSS (.is-scroll-locked); aquí solo se pone la clase.
useHead({ htmlAttrs: { class: computed(() => (open.value ? 'is-scroll-locked' : '')) } })

const links = [
  { to: '/#fases', label: 'Cómo funciona' },
  { to: '/#perfiles', label: 'Para quién es' },
  { to: '/instalaciones', label: 'Integraciones' }
]
const isActive = (to: string) => !to.includes('#') && route.path === to
</script>

<template>
  <header class="land-nav">
    <div class="container land-nav__inner">
      <NuxtLink to="/" class="land-nav__brand" aria-label="CIBERAN, inicio" @click="open = false">
        <BrandMark tone="light" :size="36" label="" />
      </NuxtLink>

      <nav class="land-nav__links" aria-label="Principal">
        <NuxtLink
          v-for="link in links" :key="link.to" :to="link.to" class="land-nav__link"
          :class="isActive(link.to) && 'is-active'" :aria-current="isActive(link.to) ? 'page' : undefined"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="land-nav__actions">
        <BaseButton to="/login" variant="outline-inverse" size="md">Acceder</BaseButton>
        <BaseButton to="/onboarding" variant="brand" size="md">Crear cuenta</BaseButton>
      </div>

      <IconButton
        :icon="open ? 'ph:x-bold' : 'ph:list-bold'" :label="open ? 'Cerrar menú' : 'Abrir menú'"
        variant="inverse" class="land-nav__toggle" :aria-expanded="open" @click="open = !open"
      />
    </div>

    <nav v-if="open" class="land-nav__menu" aria-label="Principal móvil">
      <NuxtLink
        v-for="link in links" :key="link.to" :to="link.to" class="land-nav__link"
        :class="isActive(link.to) && 'is-active'" @click="open = false"
      >
        {{ link.label }}
      </NuxtLink>
      <div class="land-nav__menu-actions">
        <BaseButton to="/onboarding" variant="brand" size="lg" block>Crear cuenta</BaseButton>
        <BaseButton to="/login" variant="outline-inverse" size="lg" block>Acceder</BaseButton>
      </div>
    </nav>
  </header>
</template>

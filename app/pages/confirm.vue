<script setup lang="ts">
import { roleMeta } from '~/utils/nav'

useHead({ title: 'Confirmando…' })

// `@nuxtjs/supabase` ya intercambió el token del enlace de confirmación por
// una sesión real antes de que esta página monte (es el `callback` de
// `redirectOptions` en nuxt.config.ts): aquí solo queda resolver el rol y
// mandar a cada uno a su sitio, igual que hace login.vue tras iniciar sesión.
const { ensureRole } = useMyRole()
const error = ref('')

onMounted(async () => {
  const role = await ensureRole()
  if (!role) {
    error.value = 'No hemos podido confirmar tu cuenta. Si el problema sigue, contacta con el equipo.'
    return
  }
  await navigateTo(roleMeta[role].home)
})
</script>

<template>
  <div class="splash">
    <WaveMotif class="splash__waves" />
    <div class="splash__box">
      <BrandMark tone="light" :size="44" label="" />
      <template v-if="error">
        <p class="splash__text">{{ error }}</p>
        <BaseButton to="/login" variant="brand">Volver a acceder</BaseButton>
      </template>
      <template v-else>
        <Icon name="ph:circle-notch-bold" class="size-7 animate-spin text-[var(--color-voltio-400)]" />
        <p class="splash__text">Confirmando tu cuenta…</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { roleMeta } from '~/utils/nav'

useHead({ title: 'Confirmando…' })

// `@nuxtjs/supabase` ya intercambió el token del enlace de confirmación por
// una sesión real antes de que esta página monte (es el `callback` de
// `redirectOptions` en nuxt.config.ts) — aquí solo queda resolver el rol y
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
  <div class="min-h-dvh bg-[var(--color-ink)] flex items-center justify-center px-5">
    <div class="text-center max-w-sm">
      <template v-if="error">
        <p class="text-[0.9375rem] text-[var(--color-status-alert)] mb-4">{{ error }}</p>
        <BaseButton to="/login" variant="secondary">Volver a acceder</BaseButton>
      </template>
      <template v-else>
        <Icon name="ph:circle-notch-bold" class="size-7 text-[var(--color-primary-500)] animate-spin mb-4" />
        <p class="text-[0.9375rem] text-[var(--color-text-muted)]">Confirmando tu cuenta…</p>
      </template>
    </div>
  </div>
</template>

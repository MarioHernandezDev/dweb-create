<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { parseAuthLinkProblem, type AuthLinkProblem } from '~/utils/auth-errors'

useHead({ title: 'Confirmando…' })

// `@nuxtjs/supabase` ya intercambió el token del enlace de confirmación por
// una sesión real antes de que esta página monte (es el `callback` de
// `redirectOptions` en nuxt.config.ts): aquí solo queda resolver el rol y
// mandar a cada uno a su sitio, igual que hace login.vue tras iniciar sesión.
// Si el enlace falló (caducado, ya usado, inválido) Supabase vuelve aquí con el error en la URL: se explica y se
// ofrece un enlace nuevo en vez de dejar al usuario sin saber qué hacer.
const { ensureRole } = useMyRole()
const problem = ref<AuthLinkProblem>(null)
const error = ref('')
const email = ref('')
const { sending, sent, error: resendError, cooldown, resend } = useResendConfirmation()

onMounted(async () => {
  problem.value = parseAuthLinkProblem(window.location.hash, window.location.search)
  if (problem.value) return
  const role = await ensureRole()
  if (!role) {
    error.value = 'No hemos podido confirmar tu cuenta. Entra con tu email y contraseña; si sigue sin funcionar, pide un enlace nuevo desde el registro.'
    return
  }
  useLoginWelcome().announce()
  await navigateTo(roleMeta[role].home)
})
</script>

<template>
  <div class="splash">
    <WaveMotif class="splash__waves" />
    <div class="splash__box">
      <BrandMark tone="light" :size="44" label="" />
      <template v-if="problem">
        <h1 class="splash__title">{{ problem === 'expired' ? 'Este enlace ha caducado' : 'Este enlace no es válido' }}</h1>
        <p class="splash__text">
          {{ problem === 'expired'
            ? 'Los enlaces de confirmación duran poco y solo se pueden usar una vez. Escribe tu email y te enviamos uno nuevo.'
            : 'Puede que esté incompleto o que ya se haya usado. Si ya confirmaste tu cuenta, entra directamente; si no, te enviamos un enlace nuevo.' }}
        </p>
        <form class="grid gap-2 w-full" data-resend-confirmation @submit.prevent="resend(email)">
          <input v-model="email" type="email" autocomplete="email" required placeholder="tu@email.com" aria-label="Tu email" class="input w-full h-11">
          <BaseButton type="submit" variant="brand" :loading="sending" :disabled="cooldown > 0 || !email.trim()">
            {{ cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Enviarme un enlace nuevo' }}
          </BaseButton>
          <p v-if="sent" class="splash__text" role="status">Listo, revisa tu bandeja de entrada (y el spam).</p>
          <p v-if="resendError" class="splash__text" role="alert">{{ resendError }}</p>
        </form>
        <BaseButton to="/login" variant="secondary">Ya la he confirmado: acceder</BaseButton>
      </template>
      <template v-else-if="error">
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

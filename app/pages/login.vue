<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { translateAuthError } from '~/utils/auth-errors'

useHead({ title: 'Acceder' })

const supabase = useSupabaseClient()
const { ensureRole } = useMyRole()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
// Cuenta creada pero sin confirmar: se ofrece reenviar el correo.
const unconfirmed = ref(false)
const { sending: resending, sent: resent, error: resendError, cooldown, resend } = useResendConfirmation()

async function login(loginEmail: string, loginPassword: string) {
  loading.value = true
  error.value = ''
  unconfirmed.value = false
  // Al cambiar de cuenta sin pasar por «Cerrar sesión» hay que tirar toda la caché de la cuenta anterior.
  resetAccountCaches()

  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
  if (signInError) {
    error.value = translateAuthError(signInError.message)
    unconfirmed.value = /email not confirmed/i.test(signInError.message)
    loading.value = false
    return
  }

  const role = await ensureRole(data.user?.id)
  if (!role) {
    error.value = 'Esta cuenta no tiene un rol asignado todavía.'
    loading.value = false
    return
  }
  useLoginWelcome().announce()
  await navigateTo(roleMeta[role].home)
}

// Google (OAuth de Supabase): solo se ofrece si está configurado (GOOGLE_AUTH_ENABLED). La vuelta entra por
// /confirm, que resuelve el rol igual que tras confirmar el email.
const googleEnabled = useRuntimeConfig().public.googleAuthEnabled === true
const googleLoading = ref(false)
async function loginWithGoogle() {
  if (googleLoading.value) return
  googleLoading.value = true
  error.value = ''
  resetAccountCaches()
  const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/confirm` } })
  if (oauthError) {
    error.value = 'No se ha podido abrir el acceso con Google. Inténtalo de nuevo o entra con tu email.'
    googleLoading.value = false
  }
}

function submit() {
  login(email.value, password.value)
}

</script>

<template>
  <AuthShell>
    <h1 class="auth__title">Accede a tu cuenta</h1>
    <p class="auth__sub">Entra con el email y la contraseña de tu cuenta CIBERAN.</p>

    <form class="auth__form" @submit.prevent="submit">
      <BaseField label="Email" v-slot="f">
        <BaseInput v-bind="f" v-model="email" type="email" required autocomplete="email" placeholder="tu@email.com" />
      </BaseField>
      <BaseField label="Contraseña" :error="error" v-slot="f">
        <BaseInput v-bind="f" v-model="password" type="password" required autocomplete="current-password" />
      </BaseField>
      <div v-if="unconfirmed" class="grid gap-2 -mt-1" data-resend-confirmation>
        <BaseButton type="button" variant="secondary" size="md" icon="ph:envelope-simple-bold" :loading="resending" :disabled="cooldown > 0" @click="resend(email)">
          {{ cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Reenviar correo de confirmación' }}
        </BaseButton>
        <p v-if="resent" class="text-sm text-[var(--text-muted)]" role="status">Si hay una cuenta pendiente con ese email, te hemos enviado el correo otra vez. Mira también el spam.</p>
        <p v-if="resendError" class="text-sm text-[var(--color-danger)]" role="alert">{{ resendError }}</p>
      </div>
      <p class="text-sm text-right -mt-2"><NuxtLink to="/forgot-password" class="text-[var(--text-muted)] hover:underline" data-forgot-link>¿Olvidaste tu contraseña?</NuxtLink></p>

      <BaseButton type="submit" variant="primary" size="lg" block :loading="loading">
        {{ loading ? 'Accediendo…' : 'Acceder' }}
      </BaseButton>
    </form>

    <BaseButton v-if="googleEnabled" variant="outline" size="lg" block icon="ph:google-logo-bold" class="mt-3" :loading="googleLoading" :disabled="loading" data-google-login @click="loginWithGoogle">
      Continuar con Google
    </BaseButton>

    <p class="auth__alt">
      ¿No tienes cuenta todavía? <NuxtLink to="/onboarding">Crea una cuenta</NuxtLink>
    </p>
  </AuthShell>
</template>

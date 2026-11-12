<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { translateAuthError } from '~/utils/auth-errors'

useHead({ title: 'Acceder' })

const supabase = useSupabaseClient()
const { ensureRole } = useMyRole()

const email = ref('')
const password = ref('')
const loading = ref(false)
const activeDemo = ref('')
const error = ref('')

const isDev = import.meta.dev

// `v-if="isDev"` ya ocultaba el botón en producción, pero el email y la
// contraseña de las cuentas de demo seguían viajando como texto plano
// dentro del bundle de cliente (confirmado leyendo el bundle real de
// `.output/` tras `npm run build`). `import.meta.dev` lo sustituye Vite por
// un booleano literal en tiempo de compilación; con el valor dentro de este
// `if`, el minificador elimina la rama entera (y las cadenas) en producción.
let demoAccounts: { label: string; email: string; icon: string }[] = []
let demoPassword = ''
if (import.meta.dev) {
  demoAccounts = [
    { label: 'Creador de contenido', email: 'creator@feedma.test', icon: 'ph:sparkle-fill' },
    { label: 'Partner', email: 'partner@feedma.test', icon: 'ph:user-circle-fill' }
  ]
  demoPassword = 'feedma-demo-2026'
}

async function login(loginEmail: string, loginPassword: string) {
  loading.value = true
  error.value = ''
  // Las cuentas de demo cambian de rol con un clic, sin pasar por «Cerrar
  // sesión»: hay que tirar toda la caché de la cuenta anterior aquí también.
  resetAccountCaches()

  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
  if (signInError) {
    error.value = translateAuthError(signInError.message)
    loading.value = false
    return
  }

  const role = await ensureRole(data.user?.id)
  if (!role) {
    error.value = 'Esta cuenta no tiene un rol asignado todavía.'
    loading.value = false
    return
  }
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

function loginAsDemo(demoEmail: string) {
  email.value = demoEmail
  password.value = demoPassword
  activeDemo.value = demoEmail
  login(demoEmail, demoPassword)
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

    <!-- Solo en desarrollo: en producción esto era una contraseña compartida en
         texto plano, visible en el bundle, para entrar como demo con un clic. -->
    <div v-if="isDev" class="mt-10 pt-6 border-t border-[var(--line)]">
      <p class="text-sm text-[var(--text-muted)] mb-3">Cuentas de prueba (equipo): un clic y dentro.</p>
      <div class="grid grid-cols-2 gap-2">
        <BaseButton
          v-for="demo in demoAccounts" :key="demo.email" variant="outline" :icon="demo.icon"
          :loading="activeDemo === demo.email && loading" :disabled="loading" @click="loginAsDemo(demo.email)"
        >
          {{ demo.label }}
        </BaseButton>
      </div>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { roleMeta } from '~/utils/nav'

useHead({ title: 'Acceder' })

const supabase = useSupabaseClient()
const { ensureRole, reset } = useMyRole()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const demoAccounts = [
  { label: 'Manager', email: 'manager@feedma.test', icon: 'ph:briefcase-fill' },
  { label: 'Influencer', email: 'influencer@feedma.test', icon: 'ph:sparkle-fill' },
  { label: 'Cliente', email: 'client@feedma.test', icon: 'ph:user-circle-fill' }
]
const demoPassword = 'feedma-demo-2026'

async function login(loginEmail: string, loginPassword: string) {
  loading.value = true
  error.value = ''
  reset()

  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
  if (signInError) {
    error.value = signInError.message === 'Invalid login credentials'
      ? 'Email o contraseña incorrectos.'
      : signInError.message
    loading.value = false
    return
  }

  // Pasamos el id directamente: useSupabaseUser() todavía no se ha
  // actualizado en este instante (lo hace un listener aparte, con un
  // pequeño retraso), así que esperar a que "se entere" solo o solo nos
  // daría un falso "esta cuenta no tiene rol".
  const role = await ensureRole(data.user?.id)
  if (!role) {
    error.value = 'Esta cuenta no tiene un rol asignado todavía.'
    loading.value = false
    return
  }
  await navigateTo(roleMeta[role].home)
}

function submit() {
  login(email.value, password.value)
}

function loginAsDemo(demoEmail: string) {
  email.value = demoEmail
  password.value = demoPassword
  login(demoEmail, demoPassword)
}
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-ink)] flex flex-col">
    <header class="flex items-center gap-2.5 px-5 py-5 md:px-10 md:py-6 max-w-sm mx-auto w-full">
      <NuxtImg src="/img/logo-svg.png" alt="" width="28" height="28" class="size-7" />
      <span class="font-display text-[1.0625rem] text-[var(--color-text)]">FEEDMA</span>
    </header>

    <main class="flex-1 flex items-center">
      <div class="w-full max-w-sm mx-auto px-5 md:px-10 py-8">
        <h1 class="font-display text-[1.875rem] text-[var(--color-text)] mb-1.5">Accede a tu cuenta</h1>
        <p class="text-[0.9375rem] text-[var(--color-text-muted)] mb-7">Entra con el email y la contraseña de tu cuenta FEEDMA.</p>

        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="email">Email</label>
            <input
              id="email" v-model="email" type="email" required autocomplete="email" placeholder="tu@email.com"
              class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
            >
          </div>
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="password">Contraseña</label>
            <input
              id="password" v-model="password" type="password" required autocomplete="current-password"
              class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
            >
          </div>

          <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)]">{{ error }}</p>

          <BaseButton type="submit" variant="primary" size="lg" class="w-full mt-1" :icon-spin="loading" :icon="loading ? 'ph:spinner-gap-bold' : undefined" :disabled="loading">
            {{ loading ? 'Accediendo…' : 'Acceder' }}
          </BaseButton>
        </form>

        <p class="mt-8 text-[0.8125rem] text-[var(--color-text-faint)] text-center">
          ¿No tienes cuenta todavía? <NuxtLink to="/onboarding" class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2">Mira cómo sería el registro</NuxtLink>
        </p>

        <div class="mt-10 pt-6 border-t border-[var(--color-hairline)]">
          <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-3">Cuentas de prueba (equipo) — un clic y dentro:</p>
          <div class="flex gap-2">
            <button
              v-for="demo in demoAccounts" :key="demo.email" type="button" :disabled="loading"
              class="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:border-[var(--color-hairline-strong)] hover:text-[var(--color-text)] disabled:opacity-40 transition-colors"
              @click="loginAsDemo(demo.email)"
            >
              <Icon :name="demo.icon" class="size-4" />
              <span class="text-[0.6875rem] font-medium">{{ demo.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

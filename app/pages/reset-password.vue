<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { parseAuthLinkProblem, translateAuthError } from '~/utils/auth-errors'
import { isRecoverySession } from '~/utils/recovery-session'

useHead({ title: 'Nueva contraseña' })

const MIN_LENGTH = 8
const supabase = useSupabaseClient()
const { ensureRole } = useMyRole()

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
// 'checking' mientras Supabase intercambia el enlace por una sesión; 'invalid' si caducó o ya se usó;
// 'otherSession' si hay una sesión abierta que NO viene del enlace (no se toca su contraseña).
const state = ref<'checking' | 'ready' | 'invalid' | 'otherSession'>('checking')

onMounted(async () => {
  // Si Supabase ya devolvió el error del enlace en la URL (caducado / inválido), no hay nada que esperar.
  if (parseAuthLinkProblem(window.location.hash, window.location.search)) { state.value = 'invalid'; return }
  // El cliente de Supabase canjea el código/token del enlace al iniciar: damos unos segundos.
  // Solo vale una sesión creada por el enlace de recuperación: una sesión ya abierta de otra cuenta no cuenta.
  let sawOtherSession = false
  for (let i = 0; i < 40; i++) {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      if (isRecoverySession(data.session.access_token)) { state.value = 'ready'; return }
      sawOtherSession = true
    }
    await new Promise(r => setTimeout(r, 250))
  }
  state.value = sawOtherSession ? 'otherSession' : 'invalid'
})

// Cierra la sesión que había abierta para poder pedir un enlace limpio.
async function signOutAndRetry() {
  await supabase.auth.signOut({ scope: 'local' })
  await navigateTo('/forgot-password')
}

async function submit() {
  error.value = ''
  if (password.value.length < MIN_LENGTH) { error.value = `La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`; return }
  if (password.value !== confirm.value) { error.value = 'Las contraseñas no coinciden.'; return }
  loading.value = true
  const { data, error: updateError } = await supabase.auth.updateUser({ password: password.value })
  if (updateError) {
    error.value = translateAuthError(updateError.message)
    loading.value = false
    return
  }
  const role = await ensureRole(data.user?.id)
  await navigateTo(role ? roleMeta[role].home : '/login')
}
</script>

<template>
  <AuthShell>
    <!-- Comprobando el enlace -->
    <template v-if="state === 'checking'">
      <span class="grid place-items-center size-14 rounded-full bg-[var(--surface-sunken)] mb-5">
        <Icon name="ph:circle-notch-bold" class="size-6 animate-spin" />
      </span>
      <h1 class="auth__title">Comprobando el enlace…</h1>
      <p class="auth__sub">Un momento, estamos validando tu enlace de recuperación.</p>
    </template>

    <!-- Hay otra sesión abierta y el enlace no se canjeó: no se toca ninguna contraseña -->
    <template v-else-if="state === 'otherSession'">
      <span class="grid place-items-center size-14 rounded-full bg-[var(--color-mantequilla)] mb-5">
        <Icon name="ph:user-switch-fill" class="size-6" />
      </span>
      <h1 class="auth__title">Hay otra sesión abierta</h1>
      <p class="auth__sub" data-reset-other-session>
        No hemos cambiado ninguna contraseña: este navegador tiene la sesión de otra cuenta y el enlace no se ha podido usar. Cierra esa sesión y pide un enlace nuevo.
      </p>
      <div class="grid gap-3 mt-6">
        <BaseButton variant="primary" size="lg" block @click="signOutAndRetry">Cerrar sesión y pedir un enlace nuevo</BaseButton>
        <p class="auth__alt"><NuxtLink to="/login">Volver a acceder</NuxtLink></p>
      </div>
    </template>

    <!-- Enlace caducado, ya usado o abierto donde no se pidió -->
    <template v-else-if="state === 'invalid'">
      <span class="grid place-items-center size-14 rounded-full bg-[var(--color-mantequilla)] mb-5">
        <Icon name="ph:link-break-bold" class="size-6" />
      </span>
      <h1 class="auth__title">No podemos usar este enlace</h1>
      <p class="auth__sub" data-reset-invalid>Tu contraseña no se ha cambiado. Pide un enlace nuevo; solo tarda un momento.</p>
      <ul class="grid gap-2 mt-5 text-sm text-[var(--text-muted)]">
        <li class="flex gap-2"><Icon name="ph:clock-bold" class="size-4 mt-0.5 shrink-0" />Los enlaces duran poco y solo valen una vez.</li>
        <li class="flex gap-2"><Icon name="ph:browser-bold" class="size-4 mt-0.5 shrink-0" />Ábrelo en el mismo navegador donde pediste el cambio.</li>
        <li class="flex gap-2"><Icon name="ph:envelope-simple-bold" class="size-4 mt-0.5 shrink-0" />Usa siempre el último correo que recibas: los anteriores dejan de valer.</li>
      </ul>
      <div class="grid gap-3 mt-6">
        <BaseButton to="/forgot-password" variant="primary" size="lg" block>Pedir un enlace nuevo</BaseButton>
        <p class="auth__alt"><NuxtLink to="/login">Volver a acceder</NuxtLink></p>
      </div>
    </template>

    <!-- Formulario -->
    <template v-else>
      <h1 class="auth__title">Elige una contraseña nueva</h1>
      <p class="auth__sub">Mínimo {{ MIN_LENGTH }} caracteres.</p>
      <form class="auth__form" @submit.prevent="submit">
        <BaseField label="Contraseña nueva" v-slot="f">
          <BaseInput v-bind="f" v-model="password" type="password" required autocomplete="new-password" :minlength="MIN_LENGTH" />
        </BaseField>
        <BaseField label="Repite la contraseña" :error="error" v-slot="f">
          <BaseInput v-bind="f" v-model="confirm" type="password" required autocomplete="new-password" />
        </BaseField>
        <BaseButton type="submit" variant="primary" size="lg" block :loading="loading">
          {{ loading ? 'Guardando…' : 'Guardar contraseña' }}
        </BaseButton>
      </form>
    </template>
  </AuthShell>
</template>

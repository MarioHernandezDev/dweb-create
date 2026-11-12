<script setup lang="ts">
import { translateAuthError } from '~/utils/auth-errors'

useHead({ title: 'Recuperar contraseña' })

const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${window.location.origin}/reset-password`
  })
  loading.value = false
  // Mensaje igual exista o no la cuenta: no revelamos qué emails están registrados.
  if (resetError && /rate limit|only request this after/i.test(resetError.message)) {
    error.value = translateAuthError(resetError.message)
    return
  }
  sent.value = true
}
</script>

<template>
  <AuthShell>
    <h1 class="auth__title">Recupera tu contraseña</h1>

    <template v-if="sent">
      <p class="auth__sub" data-reset-sent>
        Si existe una cuenta con ese email, te hemos enviado un enlace para elegir una contraseña nueva. Revisa tu bandeja de entrada (y el spam).
      </p>
      <p class="auth__alt"><NuxtLink to="/login">Volver a acceder</NuxtLink></p>
    </template>

    <template v-else>
      <p class="auth__sub">Escribe el email de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>
      <form class="auth__form" @submit.prevent="submit">
        <BaseField label="Email" :error="error" v-slot="f">
          <BaseInput v-bind="f" v-model="email" type="email" required autocomplete="email" placeholder="tu@email.com" />
        </BaseField>
        <BaseButton type="submit" variant="primary" size="lg" block :loading="loading">
          {{ loading ? 'Enviando…' : 'Enviar enlace' }}
        </BaseButton>
      </form>
      <p class="auth__alt"><NuxtLink to="/login">Volver a acceder</NuxtLink></p>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import { translateAuthError } from '~/utils/auth-errors'

useHead({ title: 'Nueva contraseña' })

const MIN_LENGTH = 8
const supabase = useSupabaseClient()
const { ensureRole } = useMyRole()

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
// 'checking' mientras Supabase intercambia el enlace por una sesión; 'invalid' si caducó o ya se usó.
const state = ref<'checking' | 'ready' | 'invalid'>('checking')

onMounted(async () => {
  // El cliente de Supabase canjea el código/token del enlace al iniciar: damos unos segundos.
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.auth.getSession()
    if (data.session) { state.value = 'ready'; return }
    await new Promise(r => setTimeout(r, 250))
  }
  state.value = 'invalid'
})

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
    <h1 class="auth__title">Elige una contraseña nueva</h1>

    <p v-if="state === 'checking'" class="auth__sub">Comprobando el enlace…</p>

    <template v-else-if="state === 'invalid'">
      <p class="auth__sub" data-reset-invalid>Este enlace ha caducado o ya se ha usado. Pide uno nuevo y vuelve a intentarlo.</p>
      <BaseButton to="/forgot-password" variant="primary" size="lg" block>Pedir un enlace nuevo</BaseButton>
    </template>

    <template v-else>
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

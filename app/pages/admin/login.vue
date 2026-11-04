<script setup lang="ts">
useHead({ title: 'Admin' })

const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    await navigateTo('/admin')
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Contraseña incorrecta.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth__main min-h-dvh">
    <form class="auth__box" @submit.prevent="submit">
      <BrandMark :size="40" class="mb-8" />
      <h1 class="auth__title">Panel de administración</h1>
      <p class="auth__sub">Solo para el equipo.</p>

      <div class="auth__form">
        <BaseField label="Contraseña" :error="error" v-slot="f">
          <BaseInput v-bind="f" v-model="password" type="password" autofocus autocomplete="current-password" />
        </BaseField>
        <BaseButton type="submit" variant="primary" size="lg" block :loading="loading" :disabled="!password">
          {{ loading ? 'Entrando…' : 'Entrar' }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>

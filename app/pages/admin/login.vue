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
  <div class="min-h-dvh flex items-center justify-center bg-[var(--color-ink)] px-5">
    <form class="w-full max-w-sm" @submit.prevent="submit">
      <h1 class="font-display text-[1.5rem] text-[var(--color-text)] mb-1">Panel de administración</h1>
      <p class="text-[0.875rem] text-[var(--color-text-muted)] mb-6">Solo para el equipo.</p>

      <input
        v-model="password" type="password" placeholder="Contraseña" autofocus
        class="w-full h-12 px-4 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 mb-3"
      >
      <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)] mb-3">{{ error }}</p>

      <BaseButton type="submit" variant="primary" size="lg" class="w-full" :icon-spin="loading" :disabled="!password || loading">
        {{ loading ? 'Entrando…' : 'Entrar' }}
      </BaseButton>
    </form>
  </div>
</template>

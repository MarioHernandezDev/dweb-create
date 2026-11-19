<script setup lang="ts">
import { TERMS_VERSION } from '~/utils/legal'

/**
 * Aceptación de términos con versión. Montado una vez en AppShell: si la cuenta
 * no tiene aceptada la versión vigente, pide aceptarla antes de seguir. Quien la
 * aceptó al registrarse (queda en los datos del alta) no ve nada: solo se anota.
 */
const client = useSupabaseClient()
const { termsPending, ensureLoaded, acceptTerms } = useAccountState()
const { logout } = useLogout()

const show = ref(false)
const saving = ref(false)
const failed = ref(false)

onMounted(async () => {
  await ensureLoaded()
  if (!termsPending.value) return
  const { data } = await client.auth.getUser()
  // Aceptada en el formulario de alta: se registra sin volver a preguntar.
  if (data.user?.user_metadata?.terms_version === TERMS_VERSION && (await acceptTerms())) return
  show.value = true
})

async function accept() {
  saving.value = true
  failed.value = false
  const ok = await acceptTerms()
  saving.value = false
  if (ok) show.value = false
  else failed.value = true
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[95] flex items-center justify-center p-5 bg-black/55 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="terms-gate-title" data-terms-gate>
      <div class="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] shadow-[var(--shadow-float)] p-6">
        <h2 id="terms-gate-title" class="font-display text-title leading-tight text-[var(--color-text)] mb-2">Términos y privacidad</h2>
        <p class="text-base text-[var(--color-text-muted)] leading-relaxed mb-4">
          Para seguir usando CIBERAN necesitamos que aceptes los
          <NuxtLink to="/terminos" target="_blank" class="underline font-semibold">términos de uso</NuxtLink>
          y la
          <NuxtLink to="/privacidad" target="_blank" class="underline font-semibold">política de privacidad</NuxtLink>
          vigentes (versión {{ TERMS_VERSION }}).
        </p>
        <p v-if="failed" class="setting-error mb-3" role="alert">No se ha podido registrar. Inténtalo de nuevo.</p>
        <div class="grid gap-2">
          <BaseButton variant="primary" size="lg" block :loading="saving" data-terms-accept @click="accept">Acepto</BaseButton>
          <BaseButton variant="ghost" size="sm" block @click="logout">No acepto: cerrar sesión</BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Eliminar la cuenta. Hay que escribir el email para confirmar. Según el caso (ver
 * server/utils/account-deletion.ts) la cuenta se borra al momento o queda una
 * solicitud pendiente que se puede retirar desde aquí.
 */
const client = useSupabaseClient()
const { resolveMyProfileId } = useMyProfileId()
const toast = useToast()

const pending = ref<{ created_at: string } | null>(null)
const open = ref(false)
const email = ref('')
const reason = ref('')
const busy = ref(false)
const error = ref('')

async function loadRequest() {
  const id = await resolveMyProfileId()
  if (!id) return
  const { data } = await client.from('account_deletion_requests').select('created_at').eq('profile_id', id).eq('status', 'pending').maybeSingle<{ created_at: string }>()
  pending.value = data ?? null
}
onMounted(loadRequest)

const message = (e: unknown, fallback: string) => {
  const d = (e as { data?: { message?: string } })?.data
  return d?.message || fallback
}

async function submit() {
  if (busy.value || !email.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ status: 'deleted' | 'requested' }>('/api/account/delete', { method: 'POST', body: { confirmEmail: email.value, reason: reason.value } })
    if (res.status === 'deleted') {
      await client.auth.signOut()
      resetAccountCaches()
      await navigateTo('/?cuenta=eliminada')
      return
    }
    open.value = false
    email.value = ''
    reason.value = ''
    await loadRequest()
    toast.success('Solicitud registrada: revisaremos la eliminación de tu cuenta')
  } catch (e) {
    error.value = message(e, 'No se ha podido procesar. Inténtalo de nuevo.')
  } finally {
    busy.value = false
  }
}

async function cancelRequest() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/account/delete', { method: 'DELETE' })
    pending.value = null
    toast.success('Solicitud retirada: tu cuenta sigue activa')
  } catch (e) {
    error.value = message(e, 'No se ha podido retirar la solicitud.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div data-delete-account>
    <template v-if="pending">
      <p class="setting-row__label">Eliminación solicitada</p>
      <p class="setting-row__meta mb-3">Como tienes colaboraciones terminadas con otras personas, el equipo de CIBERAN revisa la solicitud antes de borrar la cuenta. Mientras tanto tu perfil no se ve sin iniciar sesión. Puedes retirarla cuando quieras.</p>
      <BaseButton variant="outline" size="sm" :loading="busy" data-delete-cancel @click="cancelRequest">Retirar la solicitud</BaseButton>
    </template>
    <template v-else-if="!open">
      <p class="setting-row__meta mb-3">Borra tu cuenta y tus datos. No se puede deshacer. Antes puedes descargar una copia desde «Tus datos».</p>
      <BaseButton variant="destructive" size="sm" data-delete-open @click="open = true">Eliminar mi cuenta</BaseButton>
    </template>
    <form v-else class="grid gap-3" @submit.prevent="submit">
      <p class="setting-row__meta">Si tienes colaboraciones abiertas, ciérralas o cancélalas antes. Si ya tienes colaboraciones terminadas, la eliminación queda pendiente de revisión para no borrar los registros de la otra parte.</p>
      <BaseField label="Escribe el email de tu cuenta para confirmar" v-slot="f">
        <BaseInput v-bind="f" v-model="email" type="email" required autocomplete="off" data-delete-email />
      </BaseField>
      <BaseField label="Motivo" optional v-slot="f">
        <BaseTextarea v-bind="f" v-model="reason" rows="2" maxlength="1000" />
      </BaseField>
      <div class="flex flex-wrap gap-2 justify-end">
        <BaseButton variant="ghost" size="sm" :disabled="busy" @click="open = false">Volver</BaseButton>
        <BaseButton type="submit" variant="destructive" size="sm" :loading="busy" :disabled="!email.trim()" data-delete-submit>Eliminar definitivamente</BaseButton>
      </div>
    </form>
    <p v-if="error" class="setting-error mt-2" role="alert">{{ error }}</p>
  </div>
</template>

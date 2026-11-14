<script setup lang="ts">
import { errorText } from '~/utils/admin-labels'

interface Blocker { id: string; title: string; counterpart: string; status: string; hint: string }

/**
 * Eliminar una cuenta desde el panel (solo administración). Dos caminos, como en docs/14:
 *  - Anonimizar: vacía los datos personales y bloquea el acceso; conserva el registro que necesita la otra parte.
 *  - Borrar del todo: elimina la cuenta y sus datos (y los registros compartidos, si los hay: pide reconocerlo).
 * Hay que escribir el correo de la cuenta. Con colaboraciones abiertas no deja continuar.
 */
const props = defineProps<{
  user: { id: string; email: string | null; displayName: string | null; fullName: string | null }
  openCollaborations: Blocker[]
  hasSharedHistory: boolean
  deletionPending: boolean
}>()
const emit = defineEmits<{ changed: [] }>()

const toast = useToast()
const open = ref(false)
const mode = ref<'anonymize' | 'delete'>('anonymize')
const confirmEmail = ref('')
const acknowledge = ref(false)
const reason = ref('')
const busy = ref(false)
const error = ref('')

const emailOk = computed(() => !!props.user.email && confirmEmail.value.trim().toLowerCase() === props.user.email.toLowerCase())
const needsAck = computed(() => mode.value === 'delete' && props.hasSharedHistory)
const canSubmit = computed(() => emailOk.value && (!needsAck.value || acknowledge.value) && !props.openCollaborations.length && !busy.value)

watch(mode, () => { acknowledge.value = false })

async function submit() {
  if (!canSubmit.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ status: 'deleted' | 'anonymized' }>(`/api/admin/users/${props.user.id}/delete`, {
      method: 'POST', body: { mode: mode.value, confirmEmail: confirmEmail.value, acknowledgeSharedHistory: acknowledge.value, reason: reason.value }
    })
    if (res.status === 'deleted') {
      toast.success('Cuenta eliminada')
      await navigateTo('/admin')
    } else {
      toast.success('Cuenta anonimizada y bloqueada')
      open.value = false
      confirmEmail.value = ''
      emit('changed')
    }
  } catch (e) {
    error.value = errorText(e, 'No se ha podido eliminar la cuenta.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseCard radius="lg" padding="md" data-admin-delete-account>
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-medium text-[var(--color-text)]">Eliminar cuenta</p>
        <p class="text-micro text-[var(--color-text-muted)]">
          <template v-if="deletionPending">Esta persona ha pedido que se elimine su cuenta.</template>
          <template v-else>Para atender una petición de borrado o limpiar una cuenta. No se puede deshacer.</template>
        </p>
      </div>
      <BaseButton v-if="!open" variant="destructive" size="sm" icon="ph:trash-bold" data-admin-delete-open @click="open = true">Eliminar…</BaseButton>
    </div>

    <form v-if="open" class="grid gap-4 mt-4" data-admin-delete-form @submit.prevent="submit">
      <div v-if="openCollaborations.length" class="grid gap-2 rounded-[var(--radius-lg)] border border-[var(--color-status-alert)]/40 p-3.5" data-admin-delete-blocked>
        <p class="text-sm font-medium text-[var(--color-status-alert)]">Tiene {{ openCollaborations.length }} {{ openCollaborations.length === 1 ? 'colaboración abierta' : 'colaboraciones abiertas' }}</p>
        <p class="text-micro text-[var(--color-text-muted)]">Hay que cerrarlas o cancelarlas antes de eliminar la cuenta:</p>
        <ul class="grid gap-1.5">
          <li v-for="b in openCollaborations" :key="b.id" class="text-sm text-[var(--color-text)]">{{ b.title }} <span class="text-[var(--color-text-muted)]">con {{ b.counterpart }}</span></li>
        </ul>
      </div>

      <fieldset class="grid gap-2" :disabled="busy">
        <legend class="text-sm font-medium text-[var(--color-text)] mb-1">¿Qué hacer con la cuenta?</legend>
        <label class="flex items-start gap-2.5 cursor-pointer">
          <input v-model="mode" type="radio" value="anonymize" class="mt-1">
          <span class="text-sm text-[var(--color-text)]">Anonimizar <span class="text-micro text-[var(--color-status-ok,var(--color-text-muted))]">(recomendado si hay historial)</span><br>
            <span class="text-micro text-[var(--color-text-muted)]">Quita nombre, bio, fotos, redes, paquetes y contenido propio, y bloquea el acceso. La otra parte conserva el registro de la colaboración.</span></span>
        </label>
        <label class="flex items-start gap-2.5 cursor-pointer">
          <input v-model="mode" type="radio" value="delete" class="mt-1">
          <span class="text-sm text-[var(--color-text)]">Borrar del todo<br>
            <span class="text-micro text-[var(--color-text-muted)]">Elimina la cuenta, sus datos y sus archivos.<template v-if="hasSharedHistory"> También se llevaría los registros y chats de colaboraciones ya terminadas con otras personas.</template></span></span>
        </label>
      </fieldset>

      <label v-if="needsAck" class="flex items-start gap-2.5 cursor-pointer rounded-[var(--radius-lg)] border border-[var(--color-status-alert)]/40 p-3" data-admin-delete-ack>
        <input v-model="acknowledge" type="checkbox" class="mt-1">
        <span class="text-sm text-[var(--color-text)]">Entiendo que se borrarán también los registros compartidos con la otra parte.</span>
      </label>

      <BaseField :label="`Escribe el correo de la cuenta para confirmar (${user.email ?? 'sin correo'})`" v-slot="f">
        <BaseInput v-bind="f" v-model="confirmEmail" type="email" autocomplete="off" placeholder="correo@ejemplo.com" />
      </BaseField>
      <BaseField label="Motivo (opcional, queda en el registro)" v-slot="f">
        <BaseInput v-bind="f" v-model="reason" maxlength="500" placeholder="Ej. petición de la persona por correo" />
      </BaseField>

      <p v-if="error" class="text-sm text-[var(--color-status-alert)]" role="alert">{{ error }}</p>
      <div class="flex flex-wrap justify-end gap-2">
        <BaseButton variant="ghost" size="sm" :disabled="busy" @click="open = false">Cancelar</BaseButton>
        <BaseButton type="submit" variant="destructive" size="sm" :disabled="!canSubmit" :loading="busy" data-admin-delete-submit>
          {{ mode === 'anonymize' ? 'Anonimizar cuenta' : 'Borrar cuenta del todo' }}
        </BaseButton>
      </div>
    </form>
  </BaseCard>
</template>

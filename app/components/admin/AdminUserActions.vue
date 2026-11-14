<script setup lang="ts">
import { type AdminRole, canDo, errorText } from '~/utils/admin-labels'

/**
 * Acciones sobre una cuenta: bloquear (moderación), verificar marca y regalar Pro (administración).
 * Con `compact` solo sale el bloqueo (lista de usuarios). Cada acción pide confirmación y deja registro en el servidor.
 */
const props = defineProps<{
  user: { id: string; displayName: string | null; fullName: string | null; email: string | null; role: string; banned: boolean; partnerVerified: boolean | null }
  actorRole: AdminRole | null
  compact?: boolean
}>()
const emit = defineEmits<{ changed: [] }>()

const { confirm } = useConfirm()
const toast = useToast()
const acting = ref(false)
const months = ref(6)
const who = computed(() => props.user.displayName ?? props.user.fullName ?? props.user.email ?? 'esta cuenta')

async function run(path: string, body: Record<string, unknown>, done: string) {
  acting.value = true
  try {
    await $fetch(`/api/admin/users/${props.user.id}/${path}`, { method: 'POST', body })
    toast.success(done)
    emit('changed')
  } catch (e) {
    toast.error(errorText(e, 'No se ha podido hacer el cambio.'))
  } finally {
    acting.value = false
  }
}

async function toggleBlock() {
  const willBlock = !props.user.banned
  const ok = await confirm({
    title: willBlock ? `¿Bloquear a ${who.value}?` : `¿Desbloquear a ${who.value}?`,
    message: willBlock ? 'No podrá iniciar sesión hasta que lo desbloquees.' : 'Podrá volver a iniciar sesión con normalidad.',
    confirmLabel: willBlock ? 'Bloquear' : 'Desbloquear', tone: willBlock ? 'danger' : 'default'
  })
  if (ok) await run('block', { banned: willBlock }, willBlock ? 'Cuenta bloqueada' : 'Cuenta desbloqueada')
}

async function toggleVerified() {
  const verify = !props.user.partnerVerified
  const ok = await confirm({
    title: verify ? `¿Verificar a ${who.value}?` : `¿Quitar la verificación a ${who.value}?`,
    message: verify ? 'Su ficha mostrará la insignia de marca verificada en Descubrir y se podrá filtrar por ella.' : 'Dejará de mostrar la insignia de marca verificada.',
    confirmLabel: verify ? 'Verificar' : 'Quitar verificación'
  })
  if (ok) await run('verify', { verified: verify }, verify ? 'Marca verificada' : 'Verificación retirada')
}

async function grantPro() {
  const m = Math.max(1, Math.min(24, Math.floor(months.value) || 1))
  const ok = await confirm({
    title: `¿Regalar Pro a ${who.value}?`,
    message: `Se le concederán ${m} mes${m === 1 ? '' : 'es'} de Pro y los créditos correspondientes, sin pasar por Stripe.`,
    confirmLabel: 'Dar Pro'
  })
  if (ok) await run('grant-pro', { months: m }, 'Pro concedido')
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5" data-admin-user-actions>
    <BaseButton v-if="canDo(actorRole, 'moderator')" :variant="user.banned ? 'primary' : 'danger'" size="sm" :disabled="acting" :icon-spin="acting" data-admin-block @click="toggleBlock">
      {{ user.banned ? 'Desbloquear' : 'Bloquear' }}
    </BaseButton>
    <template v-if="!compact && canDo(actorRole, 'admin')">
      <BaseButton v-if="user.partnerVerified !== null" variant="secondary" size="sm" :icon="user.partnerVerified ? 'ph:seal-check-fill' : 'ph:seal-check'" :disabled="acting" @click="toggleVerified">
        {{ user.partnerVerified ? 'Quitar verificación' : 'Verificar marca' }}
      </BaseButton>
      <template v-if="user.role === 'creator'">
        <label class="sr-only" :for="`pro-months-${user.id}`">Meses de Pro</label>
        <input :id="`pro-months-${user.id}`" v-model.number="months" type="number" min="1" max="24" class="input w-16 h-9">
        <span class="text-micro text-[var(--color-text-faint)]">meses</span>
        <BaseButton variant="secondary" size="sm" :disabled="acting" @click="grantPro">Dar Pro</BaseButton>
      </template>
    </template>
  </div>
</template>

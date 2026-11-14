<script setup lang="ts">
import { type AdminRole, ROLE_LABELS, errorText, formatDate } from '~/utils/admin-labels'

interface Member { id: string; email: string; name: string; role: AdminRole; active: boolean; createdAt: string; lastLoginAt: string | null; createdBy: string | null }

const props = defineProps<{ memberId: string | null; sharedLogin: boolean }>()
const { confirm } = useConfirm()
const toast = useToast()

const members = ref<Member[]>([])
const loading = ref(false)
const error = ref('')
async function load() {
  loading.value = true
  try { members.value = (await $fetch<{ members: Member[] }>('/api/admin/team')).members } catch (e) { error.value = errorText(e, 'No se ha podido cargar el equipo.') } finally { loading.value = false }
}
onMounted(load)

const form = reactive({ name: '', email: '', role: 'moderator' as AdminRole, password: '' })
const adding = ref(false)
async function add() {
  adding.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/team', { method: 'POST', body: { ...form } })
    toast.success('Persona añadida al equipo')
    form.name = ''; form.email = ''; form.password = ''
    await load()
  } catch (e) {
    error.value = errorText(e, 'No se ha podido añadir.')
  } finally {
    adding.value = false
  }
}

const newPassword = reactive<Record<string, string>>({})
async function change(m: Member, body: Record<string, unknown>, done: string) {
  error.value = ''
  try {
    await $fetch(`/api/admin/team/${m.id}`, { method: 'PATCH', body })
    toast.success(done)
    newPassword[m.id] = ''
    await load()
  } catch (e) {
    error.value = errorText(e, 'No se ha podido guardar el cambio.')
    await load()
  }
}
async function toggleActive(m: Member) {
  const ok = await confirm({
    title: m.active ? `¿Desactivar a ${m.name}?` : `¿Reactivar a ${m.name}?`,
    message: m.active ? 'Perderá el acceso al panel en su siguiente petición.' : 'Podrá volver a entrar con su correo y su contraseña.',
    confirmLabel: m.active ? 'Desactivar' : 'Reactivar', tone: m.active ? 'danger' : 'default'
  })
  if (ok) await change(m, { active: !m.active }, m.active ? 'Acceso desactivado' : 'Acceso reactivado')
}
</script>

<template>
  <div class="flex flex-col gap-4" data-admin-team>
    <BaseCard radius="lg" padding="md">
      <p class="text-sm font-medium text-[var(--color-text)] mb-1">Cuentas personales del equipo</p>
      <p class="text-micro text-[var(--color-text-muted)]">
        Cada persona entra con su correo y su contraseña, y cada acción queda a su nombre en el historial.
        <template v-if="sharedLogin">La contraseña compartida sigue funcionando (aparece como «Administrador principal»). Cuando todo el equipo tenga cuenta, pon <code>ADMIN_DISABLE_SHARED_LOGIN=1</code> en el servidor para apagarla.</template>
        <template v-else>La contraseña compartida está desactivada.</template>
      </p>
      <p class="text-micro text-[var(--color-text-faint)] mt-2">Solo lectura: mira todo. Moderación: además atiende reportes y bloquea cuentas. Administración: además verifica, regala Pro, elimina cuentas y gestiona el equipo.</p>
    </BaseCard>

    <p v-if="error" class="text-sm text-[var(--color-status-alert)]" role="alert">{{ error }}</p>

    <BaseCard v-for="m in members" :key="m.id" radius="lg" padding="md" data-team-member :class="m.active ? '' : 'opacity-60'">
      <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div class="min-w-0">
          <p class="text-base font-medium text-[var(--color-text)] truncate">{{ m.name }} <span v-if="m.id === memberId" class="text-micro text-[var(--color-text-faint)]">(tú)</span></p>
          <p class="text-sm text-[var(--color-text-muted)] truncate">{{ m.email }}</p>
        </div>
        <span v-if="!m.active" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-status-alert)]/15 text-[var(--color-status-alert)]">Desactivado</span>
      </div>
      <p class="text-micro text-[var(--color-text-faint)] mb-3">Alta: {{ formatDate(m.createdAt) }}<template v-if="m.createdBy"> por {{ m.createdBy }}</template> · Último acceso: {{ formatDate(m.lastLoginAt) }}</p>
      <div class="flex flex-wrap items-center gap-2.5">
        <label class="sr-only" :for="`role-${m.id}`">Rol</label>
        <select :id="`role-${m.id}`" class="select h-9 w-auto" :value="m.role" :disabled="m.id === memberId" @change="change(m, { role: ($event.target as HTMLSelectElement).value }, 'Rol actualizado')">
          <option v-for="(label, r) in ROLE_LABELS" :key="r" :value="r">{{ label }}</option>
        </select>
        <label class="sr-only" :for="`pw-${m.id}`">Nueva contraseña</label>
        <input :id="`pw-${m.id}`" v-model="newPassword[m.id]" type="password" autocomplete="new-password" class="input h-9 w-44" placeholder="Nueva contraseña">
        <BaseButton variant="secondary" size="sm" :disabled="(newPassword[m.id] ?? '').length < 10" @click="change(m, { password: newPassword[m.id] }, 'Contraseña restablecida')">Restablecer</BaseButton>
        <BaseButton v-if="m.id !== memberId" :variant="m.active ? 'danger' : 'primary'" size="sm" @click="toggleActive(m)">{{ m.active ? 'Desactivar' : 'Reactivar' }}</BaseButton>
      </div>
    </BaseCard>
    <EmptyState v-if="!loading && !members.length" icon="ph:users-three" title="Todavía no hay cuentas personales" description="Añade a las personas del equipo aquí abajo; hasta entonces se entra con la contraseña compartida." />

    <BaseCard radius="lg" padding="md">
      <p class="text-sm font-medium text-[var(--color-text)] mb-3">Añadir a alguien</p>
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="add">
        <BaseField label="Nombre" v-slot="f"><BaseInput v-bind="f" v-model="form.name" autocomplete="off" /></BaseField>
        <BaseField label="Correo" v-slot="f"><BaseInput v-bind="f" v-model="form.email" type="email" autocomplete="off" /></BaseField>
        <BaseField label="Rol" v-slot="f"><BaseSelect v-bind="f" v-model="form.role"><option v-for="(label, r) in ROLE_LABELS" :key="r" :value="r">{{ label }}</option></BaseSelect></BaseField>
        <BaseField label="Contraseña inicial" hint="Mínimo 10 caracteres. Pásasela por un canal seguro." v-slot="f"><BaseInput v-bind="f" v-model="form.password" type="password" autocomplete="new-password" /></BaseField>
        <div class="sm:col-span-2 flex justify-end"><BaseButton type="submit" variant="primary" size="sm" :loading="adding" :disabled="!form.name || !form.email || form.password.length < 10">Añadir al equipo</BaseButton></div>
      </form>
    </BaseCard>
  </div>
</template>

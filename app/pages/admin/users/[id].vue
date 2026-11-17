<script setup lang="ts">
import { type AdminRole, COLLAB_STATUS_LABELS, REASON_LABELS, REPORT_STATUS_LABELS, ROLE_LABELS, errorText, formatDate, formatDateTime } from '~/utils/admin-labels'
import { relativeTime } from '~/utils/status'

useHead({ title: 'Ficha de cuenta · Admin' })

interface Detail {
  account: { id: string; email: string | null; fullName: string | null; role: string; createdAt: string; lastSignInAt: string | null; banned: boolean; creatorId: string | null; partnerVerified: boolean | null; displayName: string | null; planId: string | null; planStatus: string | null; planExpiresAt: string | null; deletionPending: boolean }
  collaborations: { id: string; status: string; title: string; budgetCents: number | null; paid: boolean; createdAt: string; creatorName: string | null; partnerName: string | null }[]
  collaborationsByStatus: Record<string, number>
  reports: { id: string; reason: string; status: string; createdAt: string; detail: string | null; direction: 'made' | 'received'; reporterName: string | null; reportedName: string | null }[]
  deletionRequest: { id: string; status: string; reason: string | null; createdAt: string; resolvedAt: string | null; assignedName: string | null } | null
  openCollaborations: { id: string; title: string; counterpart: string; status: string; hint: string }[]
  audit: { id: number; createdAt: string; actorName: string; action: string; detail: Record<string, unknown> | null }[]
}

const route = useRoute()
const id = String(route.params.id)
const requestFetch = useRequestFetch()
const me = await requestFetch('/api/admin/me').catch(() => ({ authenticated: false, role: null }))
if (!me.authenticated) await navigateTo('/admin/login')
const actorRole = (me as { role: AdminRole | null }).role

const detail = ref<Detail | null>(null)
const error = ref('')
const loading = ref(true)
async function load() {
  try {
    detail.value = await $fetch<Detail>(`/api/admin/users/${id}`)
    error.value = ''
  } catch (e) {
    if ((e as { statusCode?: number })?.statusCode === 401) { await navigateTo('/admin/login'); return }
    error.value = errorText(e, 'No se ha podido cargar la cuenta.')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const name = computed(() => detail.value?.account.displayName ?? detail.value?.account.fullName ?? 'Sin nombre')
const hasHistory = computed(() => Object.entries(detail.value?.collaborationsByStatus ?? {}).some(([s, n]) => n > 0 && ['completed', 'cancelled', 'terminated'].includes(s)))
const actionLabel = (a: Detail['audit'][number]) => a.action
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-ink)] px-5 py-8 md:px-10">
    <div class="max-w-3xl mx-auto grid gap-4" data-admin-user-detail>
      <BaseButton to="/admin" variant="ghost" size="sm" icon="ph:arrow-left-bold" class="self-start">Volver al panel</BaseButton>
      <p v-if="error" class="text-sm text-[var(--color-status-alert)]" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="text-sm text-[var(--color-text-muted)]" role="status">Cargando…</p>

      <template v-if="detail">
        <BaseCard radius="lg" padding="lg">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h1 class="font-display text-title text-[var(--color-text)] break-words">{{ name }}</h1>
              <p class="text-sm text-[var(--color-text-muted)] break-all">{{ detail.account.email }}</p>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)]">{{ detail.account.role === 'creator' ? 'Creador' : 'Partner' }}</span>
              <span v-if="detail.account.planId === 'pro'" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-logo-amber)]/20 text-[var(--color-text)]">Pro</span>
              <span v-if="detail.account.partnerVerified" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-logo-teal)]/15 text-[var(--color-logo-teal)]">Verificada</span>
              <span v-if="detail.account.banned" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-status-alert)]/15 text-[var(--color-status-alert)]">Bloqueada</span>
              <span v-if="detail.account.deletionPending" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-status-alert)]/15 text-[var(--color-status-alert)]">Pide eliminarse</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-x-5 gap-y-1 text-micro text-[var(--color-text-faint)] mt-3 mb-4">
            <span>Alta: {{ formatDate(detail.account.createdAt) }}</span>
            <span>Último acceso: {{ formatDate(detail.account.lastSignInAt) }}</span>
            <span v-if="detail.account.role === 'creator'">Plan: {{ detail.account.planId ?? 'free' }}<template v-if="detail.account.planExpiresAt"> (hasta {{ formatDate(detail.account.planExpiresAt) }})</template></span>
            <span>Tu rol: {{ actorRole ? ROLE_LABELS[actorRole] : '—' }}</span>
          </div>
          <AdminUserActions :user="detail.account" :actor-role="actorRole" @changed="load" />
        </BaseCard>

        <BaseCard v-if="detail.deletionRequest" radius="lg" padding="md" data-admin-user-deletion>
          <p class="text-sm font-medium text-[var(--color-text)]">Solicitud de eliminación ({{ detail.deletionRequest.status === 'pending' ? 'pendiente' : detail.deletionRequest.status === 'done' ? 'atendida' : 'descartada' }})</p>
          <p class="text-micro text-[var(--color-text-muted)]">Pedida el {{ formatDate(detail.deletionRequest.createdAt) }} · Responsable: {{ detail.deletionRequest.assignedName ?? 'sin asignar' }}</p>
          <p v-if="detail.deletionRequest.reason" class="text-sm text-[var(--color-text-muted)] mt-1">{{ detail.deletionRequest.reason }}</p>
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text)] mb-3">Colaboraciones ({{ detail.collaborations.length }})</p>
          <div v-if="Object.keys(detail.collaborationsByStatus).length" class="flex flex-wrap gap-1.5 mb-3">
            <Chip v-for="(n, s) in detail.collaborationsByStatus" :key="s" size="sm" outline>{{ COLLAB_STATUS_LABELS[s] ?? s }}: {{ n }}</Chip>
          </div>
          <p v-if="!detail.collaborations.length" class="text-sm text-[var(--color-text-muted)]">Sin colaboraciones.</p>
          <ul v-else class="grid gap-2">
            <li v-for="c in detail.collaborations" :key="c.id" class="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--color-hairline)] last:border-0" data-admin-user-collab>
              <div class="min-w-0"><p class="text-sm text-[var(--color-text)] break-words">{{ c.title }}</p><p class="text-micro text-[var(--color-text-faint)]">{{ c.partnerName }} / {{ c.creatorName }} · {{ formatDate(c.createdAt) }}<template v-if="c.budgetCents"> · {{ (c.budgetCents / 100).toLocaleString('es-ES') }} €{{ c.paid ? ' (pagada)' : '' }}</template></p></div>
              <span class="text-micro text-[var(--color-text-muted)]">{{ COLLAB_STATUS_LABELS[c.status] ?? c.status }}</span>
            </li>
          </ul>
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text)] mb-3">Reportes ({{ detail.reports.length }})</p>
          <p v-if="!detail.reports.length" class="text-sm text-[var(--color-text-muted)]">Sin reportes hechos ni recibidos.</p>
          <ul v-else class="grid gap-2">
            <li v-for="r in detail.reports" :key="r.id" class="py-2 border-b border-[var(--color-hairline)] last:border-0" data-admin-user-report>
              <p class="text-sm text-[var(--color-text)]"><span class="font-medium" :class="r.direction === 'received' ? 'text-[var(--color-status-alert)]' : ''">{{ r.direction === 'received' ? 'Recibido' : 'Enviado' }}</span> · {{ REASON_LABELS[r.reason] ?? r.reason }} · {{ REPORT_STATUS_LABELS[r.status] ?? r.status }}</p>
              <p class="text-micro text-[var(--color-text-faint)]">{{ r.reporterName }} → {{ r.reportedName ?? '—' }} · {{ formatDate(r.createdAt) }}</p>
              <p v-if="r.detail" class="text-sm text-[var(--color-text-muted)]">{{ r.detail }}</p>
            </li>
          </ul>
          <BaseButton :to="`/admin?tab=reports&r_profile=${id}&r_status=all`" variant="outline" size="sm" class="mt-3">Verlos en la bandeja</BaseButton>
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <div class="flex items-center justify-between gap-3 mb-3">
            <p class="text-sm font-medium text-[var(--color-text)]">Lo que ha hecho el equipo sobre esta cuenta</p>
            <BaseButton :to="`/admin?tab=activity&a_profile=${id}`" variant="ghost" size="sm">Toda su actividad</BaseButton>
          </div>
          <p v-if="!detail.audit.length" class="text-sm text-[var(--color-text-muted)]">Nada todavía.</p>
          <ul v-else class="grid gap-1.5">
            <li v-for="a in detail.audit" :key="a.id" class="text-sm text-[var(--color-text)]" data-admin-user-audit>
              <span class="font-medium">{{ a.actorName }}</span> {{ actionLabel(a) }} <span class="text-micro text-[var(--color-text-faint)]" :title="formatDateTime(a.createdAt)">· {{ relativeTime(a.createdAt) }}</span>
            </li>
          </ul>
        </BaseCard>

        <AdminDeleteAccount
          v-if="actorRole === 'admin'" :user="detail.account" :open-collaborations="detail.openCollaborations"
          :has-shared-history="hasHistory" :deletion-pending="detail.account.deletionPending" @changed="load"
        />
      </template>
    </div>
    <ConfirmDialogHost />
    <ToastHost />
  </div>
</template>

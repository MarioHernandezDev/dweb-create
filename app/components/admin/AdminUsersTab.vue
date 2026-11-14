<script setup lang="ts">
import { type AdminRole, formatDate } from '~/utils/admin-labels'

export interface AdminUserListItem {
  id: string; email: string | null; fullName: string | null; role: string; createdAt: string; lastSignInAt: string | null; banned: boolean
  creatorId: string | null; partnerVerified: boolean | null; displayName: string | null; planId: string | null; planStatus: string | null
  planExpiresAt: string | null; deletionPending: boolean
}

defineProps<{ actorRole: AdminRole | null }>()
const { filters, page, pageSize, items, total, loading, error, load, setPage } = useAdminList<AdminUserListItem>({
  endpoint: '/api/admin/users', prefix: 'u_', dataKey: 'users', pageSize: 25,
  defaults: { q: '', role: '', plan: '', status: '', verified: '', sort: 'recent' }
})
onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-3" data-admin-users>
    <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      <div class="relative sm:col-span-2 lg:col-span-3">
        <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-faint)]" />
        <label class="sr-only" for="u-q">Buscar cuentas</label>
        <input id="u-q" v-model="filters.q" type="search" class="input w-full pl-9" placeholder="Buscar por nombre, empresa, correo o id…" data-admin-search>
      </div>
      <label class="sr-only" for="u-role">Rol</label>
      <select id="u-role" v-model="filters.role" class="select"><option value="">Todos los roles</option><option value="creator">Creadores</option><option value="partner">Partners</option></select>
      <label class="sr-only" for="u-plan">Plan</label>
      <select id="u-plan" v-model="filters.plan" class="select"><option value="">Cualquier plan</option><option value="pro">Pro</option><option value="free">Gratis (creadores)</option></select>
      <label class="sr-only" for="u-status">Estado</label>
      <select id="u-status" v-model="filters.status" class="select"><option value="">Cualquier estado</option><option value="active">Activas</option><option value="banned">Bloqueadas</option><option value="deletion">Con eliminación pedida</option></select>
      <label class="sr-only" for="u-verified">Verificación</label>
      <select id="u-verified" v-model="filters.verified" class="select"><option value="">Verificación: todas</option><option value="yes">Marcas verificadas</option><option value="no">Marcas sin verificar</option></select>
      <label class="sr-only" for="u-sort">Orden</label>
      <select id="u-sort" v-model="filters.sort" class="select"><option value="recent">Más recientes</option><option value="login">Último acceso</option><option value="name">Nombre (A–Z)</option></select>
    </div>

    <p v-if="error" class="text-sm text-[var(--color-status-alert)]" role="alert">{{ error }}</p>
    <EmptyState v-if="!loading && !items.length && !error" icon="ph:users" :title="filters.q || filters.role || filters.plan || filters.status || filters.verified ? 'Ninguna cuenta con esos filtros' : 'Sin usuarios todavía'" />

    <BaseCard v-for="user in items" :key="user.id" radius="lg" padding="md" data-admin-user-row>
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="min-w-0">
          <NuxtLink :to="`/admin/users/${user.id}`" class="text-base font-medium text-[var(--color-text)] truncate block hover:underline">
            {{ user.displayName ?? user.fullName ?? 'Sin nombre' }}
          </NuxtLink>
          <p class="text-sm text-[var(--color-text-muted)] truncate">{{ user.email }}</p>
        </div>
        <div class="flex flex-wrap justify-end gap-1.5 shrink-0">
          <span class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)]" :class="user.role === 'creator' ? 'bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)]' : 'bg-[var(--color-logo-teal)]/15 text-[var(--color-logo-teal)]'">
            {{ user.role === 'creator' ? 'Creador' : 'Partner' }}
          </span>
          <span v-if="user.planId === 'pro'" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-logo-amber)]/20 text-[var(--color-text)]">Pro</span>
          <span v-if="user.partnerVerified" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-logo-teal)]/15 text-[var(--color-logo-teal)]">Verificada</span>
          <span v-if="user.banned" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-status-alert)]/15 text-[var(--color-status-alert)]">Bloqueada</span>
          <span v-if="user.deletionPending" class="text-micro font-medium px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-status-alert)]/15 text-[var(--color-status-alert)]">Pide eliminarse</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-[var(--color-text-faint)] mb-3">
        <span>Alta: {{ formatDate(user.createdAt) }}</span>
        <span>Último acceso: {{ formatDate(user.lastSignInAt) }}</span>
        <span v-if="user.role === 'creator'">Plan: {{ user.planId ?? 'free' }}<template v-if="user.planExpiresAt"> (hasta {{ formatDate(user.planExpiresAt) }})</template></span>
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <BaseButton :to="`/admin/users/${user.id}`" variant="outline" size="sm" icon="ph:identification-card-bold">Ver ficha</BaseButton>
        <AdminUserActions :user="user" :actor-role="actorRole" compact @changed="load" />
      </div>
    </BaseCard>

    <AdminPagination :page="page" :page-size="pageSize" :total="total" :loading="loading" @update:page="setPage" />
  </div>
</template>

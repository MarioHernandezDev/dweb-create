<script setup lang="ts">
import { relativeTime } from '~/utils/status'

useHead({ title: 'Panel de admin' })

interface AdminUser {
  id: string
  email: string | null
  fullName: string | null
  role: string
  createdAt: string
  lastSignInAt: string | null
  bannedUntil: string | null
  creatorId: string | null
  displayName: string | null
  planId: string | null
  planStatus: string | null
  planExpiresAt: string | null
}

interface AdminReport {
  id: string
  reason: string
  detail: string | null
  createdAt: string
  reporterName: string
  reporterRole: string | null
  collaborationBrief: string | null
  creatorName: string | null
  partnerName: string | null
}

interface ActivityEvent {
  type: string
  summary: string
  createdAt: string
}

interface AnalyticsData {
  labels: string[]
  signups: number[]
  collaborationsCreated: number[]
  revenueCents: number[]
  proPaid: number[]
  proGifted: number[]
}

interface DiscoveryAnalyticsData {
  labels: string[]
  volume: number[]
  totalSearches: number
  byMode: { filters: number; ai: number }
  byRole: { creator: number; partner: number }
  zeroResultCount: number
  topCategories: { category: string; count: number }[]
  recentQueries: { queryText: string | null; role: string; resultsCount: number; createdAt: string }[]
}

const activityIcons: Record<string, string> = {
  signup: 'ph:user-plus-fill',
  collaboration_created: 'ph:handshake-fill',
  payment: 'ph:currency-eur-fill',
  pro_paid: 'ph:sparkle-fill',
  pro_gifted: 'ph:gift-fill'
}

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  unrealistic_budget: 'Presupuesto poco serio',
  inappropriate: 'Contenido inapropiado',
  other: 'Otro motivo'
}

const me = await $fetch('/api/admin/me').catch(() => ({ authenticated: false }))
if (!me.authenticated) await navigateTo('/admin/login')

const tab = ref<'users' | 'activity' | 'analytics' | 'reports'>('users')
const tabs = [
  { value: 'users', label: 'Usuarios' },
  { value: 'activity', label: 'Actividad' },
  { value: 'analytics', label: 'Analíticas' },
  { value: 'reports', label: 'Reportes' }
]

const users = ref<AdminUser[]>([])
const loadingUsers = ref(false)
async function loadUsers() {
  loadingUsers.value = true
  try {
    const res = await $fetch('/api/admin/users')
    users.value = res.users as AdminUser[]
  } finally {
    loadingUsers.value = false
  }
}
await loadUsers()

const reports = ref<AdminReport[]>([])
const loadingReports = ref(false)
let reportsLoaded = false
async function loadReports() {
  loadingReports.value = true
  try {
    const res = await $fetch('/api/admin/reports')
    reports.value = res.reports as AdminReport[]
    reportsLoaded = true
  } finally {
    loadingReports.value = false
  }
}

const activity = ref<ActivityEvent[]>([])
const loadingActivity = ref(false)
let activityLoaded = false
async function loadActivity() {
  loadingActivity.value = true
  try {
    const res = await $fetch('/api/admin/activity')
    activity.value = res.events as ActivityEvent[]
    activityLoaded = true
  } finally {
    loadingActivity.value = false
  }
}

const analyticsUnit = ref<'week' | 'month'>('week')
const analytics = ref<AnalyticsData | null>(null)
const loadingAnalytics = ref(false)
async function loadAnalytics() {
  loadingAnalytics.value = true
  try {
    analytics.value = await $fetch('/api/admin/analytics', { query: { unit: analyticsUnit.value } })
  } finally {
    loadingAnalytics.value = false
  }
}

const discoveryAnalytics = ref<DiscoveryAnalyticsData | null>(null)
const loadingDiscoveryAnalytics = ref(false)
async function loadDiscoveryAnalytics() {
  loadingDiscoveryAnalytics.value = true
  try {
    discoveryAnalytics.value = await $fetch('/api/admin/discovery-analytics')
  } finally {
    loadingDiscoveryAnalytics.value = false
  }
}

watch(tab, (value) => {
  if (value === 'reports' && !reportsLoaded) loadReports()
  if (value === 'activity' && !activityLoaded) loadActivity()
  if (value === 'analytics' && !analytics.value) loadAnalytics()
  if (value === 'analytics' && !discoveryAnalytics.value) loadDiscoveryAnalytics()
})
watch(analyticsUnit, loadAnalytics)

const discoveryVolumeSeries = computed(() => [{
  label: 'Búsquedas', color: 'var(--color-logo-amber)', values: discoveryAnalytics.value?.volume ?? []
}])
const maxCategoryCount = computed(() => Math.max(1, ...(discoveryAnalytics.value?.topCategories.map((c) => c.count) ?? [1])))

const euroFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const formatEuroValue = (v: number) => euroFormatter.format(v)
const formatIntValue = (v: number) => String(Math.round(v))

const revenueSeries = computed(() => [{
  label: 'Ingresos', color: 'var(--color-chart-primary)', values: (analytics.value?.revenueCents ?? []).map((c) => c / 100)
}])
const signupsSeries = computed(() => [{ label: 'Registros', color: 'var(--color-primary-500)', values: analytics.value?.signups ?? [] }])
const collabsSeries = computed(() => [{ label: 'Colaboraciones', color: 'var(--color-logo-teal)', values: analytics.value?.collaborationsCreated ?? [] }])
const proSeries = computed(() => [
  { label: 'Pro pagado', color: 'var(--color-primary-500)', values: analytics.value?.proPaid ?? [] },
  { label: 'Pro regalado', color: 'var(--color-logo-amber)', values: analytics.value?.proGifted ?? [] }
])

const acting = ref<string | null>(null)
async function toggleBlock(user: AdminUser) {
  acting.value = user.id
  try {
    await $fetch(`/api/admin/users/${user.id}/block`, { method: 'POST', body: { banned: !user.bannedUntil } })
    await loadUsers()
  } finally {
    acting.value = null
  }
}

const monthsByUser = reactive<Record<string, number>>({})
function monthsFor(id: string) {
  return monthsByUser[id] ?? 6
}
async function grantPro(user: AdminUser) {
  acting.value = user.id
  try {
    await $fetch(`/api/admin/users/${user.id}/grant-pro`, { method: 'POST', body: { months: monthsFor(user.id) } })
    await loadUsers()
  } finally {
    acting.value = null
  }
}

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-ink)] px-5 py-8 md:px-10">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="font-display text-[1.5rem] text-[var(--color-text)]">Panel de administración</h1>
        <BaseButton variant="secondary" size="sm" icon="ph:sign-out-bold" @click="logout">Salir</BaseButton>
      </div>

      <SegmentedTabs v-model="tab" :options="tabs" class="mb-6" />

      <div v-if="tab === 'users'" class="flex flex-col gap-2.5">
        <EmptyState v-if="!loadingUsers && !users.length" icon="ph:users" title="Sin usuarios todavía" />
        <BaseCard v-for="user in users" :key="user.id" radius="lg" padding="md">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="min-w-0">
              <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">
                {{ user.displayName ?? user.fullName ?? 'Sin nombre' }}
              </p>
              <p class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">{{ user.email }}</p>
            </div>
            <span
              class="shrink-0 text-[0.75rem] font-medium px-2 py-1 rounded-[var(--radius-xs)]"
              :class="user.role === 'creator' ? 'bg-[var(--color-primary-500)]/15 text-[var(--color-primary-500)]' : 'bg-[var(--color-logo-teal)]/15 text-[var(--color-logo-teal)]'"
            >
              {{ user.role === 'creator' ? 'Creador' : 'Partner' }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] text-[var(--color-text-faint)] mb-3">
            <span>Alta: {{ formatDate(user.createdAt) }}</span>
            <span>Último login: {{ formatDate(user.lastSignInAt) }}</span>
            <span v-if="user.role === 'creator'">
              Plan: {{ user.planId ?? 'free' }}<template v-if="user.planExpiresAt"> (hasta {{ formatDate(user.planExpiresAt) }})</template>
            </span>
            <span v-if="user.bannedUntil" class="text-[var(--color-status-alert)] font-medium">Bloqueado</span>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <BaseButton
              :variant="user.bannedUntil ? 'primary' : 'danger'" size="sm" :disabled="acting === user.id"
              :icon-spin="acting === user.id" @click="toggleBlock(user)"
            >
              {{ user.bannedUntil ? 'Desbloquear' : 'Bloquear' }}
            </BaseButton>

            <template v-if="user.role === 'creator'">
              <input
                v-model.number="monthsByUser[user.id]" type="number" min="1" max="24" :placeholder="String(monthsFor(user.id))"
                class="w-16 h-9 px-2 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)] text-center"
              >
              <span class="text-[0.75rem] text-[var(--color-text-faint)]">meses</span>
              <BaseButton variant="secondary" size="sm" :disabled="acting === user.id" :icon-spin="acting === user.id" @click="grantPro(user)">
                Dar Pro
              </BaseButton>
            </template>
          </div>
        </BaseCard>
      </div>

      <div v-else-if="tab === 'activity'" class="flex flex-col gap-2">
        <EmptyState v-if="!loadingActivity && !activity.length" icon="ph:pulse" title="Sin actividad todavía" />
        <BaseCard v-for="(item, i) in activity" :key="i" radius="lg" padding="md" class="flex items-center gap-3">
          <span class="flex items-center justify-center size-9 rounded-full bg-[var(--color-primary-500)]/12 text-[var(--color-primary-500)] shrink-0">
            <Icon :name="activityIcons[item.type] ?? 'ph:bell-fill'" class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-[0.875rem] text-[var(--color-text)]">{{ item.summary }}</p>
            <p class="text-[0.75rem] text-[var(--color-text-faint)]">{{ relativeTime(item.createdAt) }}</p>
          </div>
        </BaseCard>
      </div>

      <div v-else-if="tab === 'analytics'" class="flex flex-col gap-6">
        <SegmentedTabs v-model="analyticsUnit" :options="[{ value: 'week', label: 'Semanas' }, { value: 'month', label: 'Meses' }]" />

        <BaseCard radius="lg" padding="lg">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-4">Nuevos registros</p>
          <BarChart v-if="analytics" :labels="analytics.labels" :series="signupsSeries" :format-value="formatIntValue" />
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-4">Colaboraciones nuevas</p>
          <BarChart v-if="analytics" :labels="analytics.labels" :series="collabsSeries" :format-value="formatIntValue" />
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-4">Ingresos cobrados (colaboraciones pagadas)</p>
          <BarChart v-if="analytics" :labels="analytics.labels" :series="revenueSeries" :format-value="formatEuroValue" />
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-4">Inicios de Pro — pagado vs. regalado</p>
          <BarChart v-if="analytics" :labels="analytics.labels" :series="proSeries" :format-value="formatIntValue" />
        </BaseCard>

        <p class="font-display text-[1.0625rem] text-[var(--color-text)] -mb-2">Descubrir — qué pide la gente</p>

        <div v-if="discoveryAnalytics" class="grid grid-cols-2 gap-3">
          <BaseCard radius="lg" padding="md">
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-1">Búsquedas (8 semanas)</p>
            <p class="font-display text-[1.375rem] text-[var(--color-text)]">{{ discoveryAnalytics.totalSearches }}</p>
          </BaseCard>
          <BaseCard radius="lg" padding="md">
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-1">Sin ningún resultado</p>
            <p class="font-display text-[1.375rem] text-[var(--color-text)]">{{ discoveryAnalytics.zeroResultCount }}</p>
          </BaseCard>
          <BaseCard radius="lg" padding="md">
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-1">Filtros vs. IA</p>
            <p class="font-display text-[1.0625rem] text-[var(--color-text)]">{{ discoveryAnalytics.byMode.filters }} / {{ discoveryAnalytics.byMode.ai }}</p>
          </BaseCard>
          <BaseCard radius="lg" padding="md">
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mb-1">Creadores vs. partners</p>
            <p class="font-display text-[1.0625rem] text-[var(--color-text)]">{{ discoveryAnalytics.byRole.creator }} / {{ discoveryAnalytics.byRole.partner }}</p>
          </BaseCard>
        </div>

        <BaseCard radius="lg" padding="lg">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-4">Volumen de búsquedas por semana</p>
          <BarChart v-if="discoveryAnalytics" :labels="discoveryAnalytics.labels" :series="discoveryVolumeSeries" :format-value="formatIntValue" />
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-4">Categorías más pedidas</p>
          <EmptyState v-if="discoveryAnalytics && !discoveryAnalytics.topCategories.length" icon="ph:tag" title="Sin categorías todavía" />
          <div v-else-if="discoveryAnalytics" class="flex flex-col gap-2">
            <div v-for="c in discoveryAnalytics.topCategories" :key="c.category" class="flex items-center gap-2.5">
              <span class="w-28 shrink-0 text-[0.8125rem] text-[var(--color-text-muted)] truncate">{{ c.category }}</span>
              <div class="flex-1 h-2 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
                <div class="h-full rounded-full bg-[var(--color-primary-500)]" :style="{ width: `${(c.count / maxCategoryCount) * 100}%` }" />
              </div>
              <span class="w-6 shrink-0 text-right text-[0.75rem] text-[var(--color-text-faint)]">{{ c.count }}</span>
            </div>
          </div>
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-4">Búsquedas recientes con IA (texto libre)</p>
          <EmptyState v-if="discoveryAnalytics && !discoveryAnalytics.recentQueries.length" icon="ph:sparkle" title="Nadie ha usado la búsqueda por IA todavía" />
          <div v-else-if="discoveryAnalytics" class="flex flex-col gap-2">
            <div v-for="(q, i) in discoveryAnalytics.recentQueries" :key="i" class="flex items-start justify-between gap-3 py-2 border-b border-[var(--color-hairline)] last:border-0">
              <div class="min-w-0">
                <p class="text-[0.8125rem] text-[var(--color-text)]">"{{ q.queryText }}"</p>
                <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">{{ q.role === 'creator' ? 'Creador' : 'Partner' }} · {{ relativeTime(q.createdAt) }}</p>
              </div>
              <span class="shrink-0 text-[0.75rem] text-[var(--color-text-faint)]">{{ q.resultsCount }} resultado{{ q.resultsCount === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </BaseCard>
      </div>

      <div v-else class="flex flex-col gap-2.5">
        <EmptyState v-if="!loadingReports && !reports.length" icon="ph:flag" title="Sin reportes" description="Cuando alguien reporte una solicitud, aparecerá aquí." />
        <BaseCard v-for="report in reports" :key="report.id" radius="lg" padding="md">
          <div class="flex items-center justify-between gap-3 mb-2">
            <span class="text-[0.8125rem] font-medium text-[var(--color-status-alert)]">{{ reasonLabels[report.reason] ?? report.reason }}</span>
            <span class="text-[0.75rem] text-[var(--color-text-faint)]">{{ formatDate(report.createdAt) }}</span>
          </div>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)] mb-2">
            Reportado por {{ report.reporterName }} ({{ report.reporterRole === 'creator' ? 'creador' : 'partner' }})
          </p>
          <p v-if="report.collaborationBrief" class="text-[0.8125rem] text-[var(--color-text)] mb-1">
            "{{ report.collaborationBrief }}" — {{ report.creatorName }} / {{ report.partnerName }}
          </p>
          <p v-if="report.detail" class="text-[0.8125rem] text-[var(--color-text-muted)]">{{ report.detail }}</p>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

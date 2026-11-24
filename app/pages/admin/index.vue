<script setup lang="ts">
import type { Avg, MetricsResult } from '~~/server/utils/collab-metrics'
import { type AdminRole, ROLE_LABELS, canDo } from '~/utils/admin-labels'
import { formatDecimal, formatHours, formatPct } from '~/utils/insights-view'
import { formatMoney } from '~/utils/money'
import { relativeTime } from '~/utils/status'
import type { AdminAlertItem } from '~/components/admin/AdminAlerts.vue'

useHead({ title: 'Panel de admin' })

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

// `useRequestFetch()` reenvía la cookie de sesión también en el render del
// servidor; con `$fetch` a secas, al recargar /admin o abrirlo por URL
// directa la petición salía sin cookie y siempre mandaba al login (M-S2).
const requestFetch = useRequestFetch()
const me = await requestFetch('/api/admin/me').catch(() => ({ authenticated: false, name: null, role: null, memberId: null, sharedLogin: true }))
if (!me.authenticated) await navigateTo('/admin/login')
const actorRole = me.role as AdminRole | null
const memberId = me.memberId as string | null

const route = useRoute()
const router = useRouter()
type TabId = 'users' | 'activity' | 'reports' | 'analytics' | 'platform' | 'team'
const validTabs: TabId[] = ['users', 'activity', 'reports', 'analytics', 'platform', 'team']
const initial = validTabs.includes(route.query.tab as TabId) ? (route.query.tab as TabId) : 'users'
const tab = ref<TabId>(initial === 'team' && !canDo(actorRole, 'admin') ? 'users' : initial)

// ---- Pendientes y alertas ----
const overview = ref<{ counts: { reportsOpen: number; reportsReviewing: number; reportsUnassigned: number; deletionsPending: number }; alerts: AdminAlertItem[] } | null>(null)
async function loadOverview() {
  overview.value = await $fetch<NonNullable<typeof overview.value>>('/api/admin/overview').catch(() => null)
}
onMounted(loadOverview)
const pendingCount = computed(() => (overview.value ? overview.value.counts.reportsOpen + overview.value.counts.reportsReviewing + overview.value.counts.deletionsPending : 0))

const tabs = computed(() => [
  { value: 'users', label: 'Usuarios' },
  { value: 'activity', label: 'Actividad' },
  { value: 'reports', label: pendingCount.value ? `Reportes (${pendingCount.value})` : 'Reportes' },
  { value: 'analytics', label: 'Analíticas' },
  { value: 'platform', label: 'Colaboraciones' },
  ...(canDo(actorRole, 'admin') ? [{ value: 'team', label: 'Equipo' }] : [])
])

// Cada cambio de pestaña (o clic en una alerta) remonta el componente para que lea los filtros de la URL.
const tabKey = ref(0)
function selectTab(value: string) {
  tab.value = value as TabId
  router.replace({ query: { tab: value === 'users' ? undefined : value } })
  tabKey.value++
}
function openAlert(a: AdminAlertItem) {
  tab.value = a.tab as TabId
  router.replace({ query: { tab: a.tab, ...(a.query ?? {}) } })
  tabKey.value++
}
// Enlaces desde otras pantallas (p. ej. la ficha) que ya traen sus filtros.
onMounted(() => { if (route.query.tab) tabKey.value++ })

// ---- Métricas propias de la plataforma y fiabilidad por cuenta (server/utils/collab-metrics.ts) ----
interface PlatformAccount {
  profileId: string; name: string; role: 'creator' | 'partner'
  started: number; completed: number; cancelled: number; terminatedByMe: number; terminatedAgainstMe: number
  successRate: Avg | null; onTimeRate: Avg | null; responseHours: Avg | null; rating: Avg | null
}
const platform = ref<{ metrics: MetricsResult; accounts: PlatformAccount[] } | null>(null)
const platformRange = ref('12m')
const loadingPlatform = ref(false)
const platformError = ref('')
async function loadPlatform() {
  loadingPlatform.value = true
  platformError.value = ''
  try {
    platform.value = await $fetch<{ metrics: MetricsResult; accounts: PlatformAccount[] }>('/api/admin/platform-metrics', { query: { range: platformRange.value } })
  } catch {
    platformError.value = 'No se han podido cargar las métricas.'
  } finally {
    loadingPlatform.value = false
  }
}
function setPlatformRange(v: string) {
  platformRange.value = v
  loadPlatform()
}

const analyticsUnit = ref<'week' | 'month'>('week')
const analytics = ref<AnalyticsData | null>(null)
const loadingAnalytics = ref(false)
async function loadAnalytics() {
  loadingAnalytics.value = true
  try {
    analytics.value = await requestFetch('/api/admin/analytics', { query: { unit: analyticsUnit.value } })
  } finally {
    loadingAnalytics.value = false
  }
}

const discoveryAnalytics = ref<DiscoveryAnalyticsData | null>(null)
const loadingDiscoveryAnalytics = ref(false)
async function loadDiscoveryAnalytics() {
  loadingDiscoveryAnalytics.value = true
  try {
    discoveryAnalytics.value = await requestFetch('/api/admin/discovery-analytics')
  } finally {
    loadingDiscoveryAnalytics.value = false
  }
}

watch(tab, (value) => {
  if (value === 'platform' && !platform.value) loadPlatform()
  if (value === 'analytics' && !analytics.value) loadAnalytics()
  if (value === 'analytics' && !discoveryAnalytics.value) loadDiscoveryAnalytics()
}, { immediate: true })
watch(analyticsUnit, loadAnalytics)

const discoveryVolumeSeries = computed(() => [{
  label: 'Búsquedas', color: 'var(--color-logo-amber)', values: discoveryAnalytics.value?.volume ?? []
}])
const maxCategoryCount = computed(() => Math.max(1, ...(discoveryAnalytics.value?.topCategories.map((c) => c.count) ?? [1])))

const formatEuroValue = (v: number) => formatMoney(v * 100)
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

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-ink)] px-5 py-8 md:px-10">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between gap-3 mb-6">
        <div class="min-w-0">
          <h1 class="font-display text-[1.5rem] text-[var(--color-text)]">Panel de administración</h1>
          <p v-if="me.name" class="text-micro text-[var(--color-text-faint)]" data-admin-whoami>{{ me.name }} · {{ actorRole ? ROLE_LABELS[actorRole] : '' }}</p>
        </div>
        <BaseButton variant="secondary" size="sm" icon="ph:sign-out-bold" @click="logout">Salir</BaseButton>
      </div>

      <AdminAlerts :alerts="overview?.alerts ?? []" @open="openAlert" />

      <SegmentedTabs :model-value="tab" :options="tabs" class="mb-6" @update:model-value="selectTab" />

      <AdminUsersTab v-if="tab === 'users'" :key="`u${tabKey}`" :actor-role="actorRole" />

      <AdminActivityTab v-else-if="tab === 'activity'" :key="`a${tabKey}`" />

      <div v-else-if="tab === 'analytics'" class="flex flex-col gap-6">
        <SegmentedTabs v-model="analyticsUnit" :options="[{ value: 'week', label: 'Semanas' }, { value: 'month', label: 'Meses' }]" />

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text-muted)] mb-4">Nuevos registros</p>
          <BarChart v-if="analytics" :labels="analytics.labels" :series="signupsSeries" :format-value="formatIntValue" />
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text-muted)] mb-4">Colaboraciones nuevas</p>
          <BarChart v-if="analytics" :labels="analytics.labels" :series="collabsSeries" :format-value="formatIntValue" />
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text-muted)] mb-4">Ingresos cobrados (colaboraciones pagadas)</p>
          <BarChart v-if="analytics" :labels="analytics.labels" :series="revenueSeries" :format-value="formatEuroValue" />
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text-muted)] mb-4">Inicios de Pro — pagado vs. regalado</p>
          <BarChart v-if="analytics" :labels="analytics.labels" :series="proSeries" :format-value="formatIntValue" />
        </BaseCard>

        <p class="font-display text-lg text-[var(--color-text)] -mb-2">Descubrir — qué pide la gente</p>

        <div v-if="discoveryAnalytics" class="grid grid-cols-2 gap-3">
          <BaseCard radius="lg" padding="md">
            <p class="text-micro text-[var(--color-text-faint)] mb-1">Búsquedas (8 semanas)</p>
            <p class="font-display text-title text-[var(--color-text)]">{{ discoveryAnalytics.totalSearches }}</p>
          </BaseCard>
          <BaseCard radius="lg" padding="md">
            <p class="text-micro text-[var(--color-text-faint)] mb-1">Sin ningún resultado</p>
            <p class="font-display text-title text-[var(--color-text)]">{{ discoveryAnalytics.zeroResultCount }}</p>
          </BaseCard>
          <BaseCard radius="lg" padding="md">
            <p class="text-micro text-[var(--color-text-faint)] mb-1">Filtros vs. IA</p>
            <p class="font-display text-lg text-[var(--color-text)]">{{ discoveryAnalytics.byMode.filters }} / {{ discoveryAnalytics.byMode.ai }}</p>
          </BaseCard>
          <BaseCard radius="lg" padding="md">
            <p class="text-micro text-[var(--color-text-faint)] mb-1">Creadores vs. partners</p>
            <p class="font-display text-lg text-[var(--color-text)]">{{ discoveryAnalytics.byRole.creator }} / {{ discoveryAnalytics.byRole.partner }}</p>
          </BaseCard>
        </div>

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text-muted)] mb-4">Volumen de búsquedas por semana</p>
          <BarChart v-if="discoveryAnalytics" :labels="discoveryAnalytics.labels" :series="discoveryVolumeSeries" :format-value="formatIntValue" />
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text-muted)] mb-4">Categorías más pedidas</p>
          <EmptyState v-if="discoveryAnalytics && !discoveryAnalytics.topCategories.length" icon="ph:tag" title="Sin categorías todavía" />
          <div v-else-if="discoveryAnalytics" class="flex flex-col gap-2">
            <div v-for="c in discoveryAnalytics.topCategories" :key="c.category" class="flex items-center gap-2.5">
              <span class="w-28 shrink-0 text-sm text-[var(--color-text-muted)] truncate">{{ c.category }}</span>
              <div class="flex-1 h-2 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
                <div class="h-full rounded-full bg-[var(--color-primary-500)]" :style="{ width: `${(c.count / maxCategoryCount) * 100}%` }" />
              </div>
              <span class="w-6 shrink-0 text-right text-micro text-[var(--color-text-faint)]">{{ c.count }}</span>
            </div>
          </div>
        </BaseCard>

        <BaseCard radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text-muted)] mb-4">Búsquedas recientes con IA (texto libre)</p>
          <EmptyState v-if="discoveryAnalytics && !discoveryAnalytics.recentQueries.length" icon="ph:sparkle" title="Nadie ha usado la búsqueda por IA todavía" />
          <div v-else-if="discoveryAnalytics" class="flex flex-col gap-2">
            <div v-for="(q, i) in discoveryAnalytics.recentQueries" :key="i" class="flex items-start justify-between gap-3 py-2 border-b border-[var(--color-hairline)] last:border-0">
              <div class="min-w-0">
                <p class="text-sm text-[var(--color-text)]">"{{ q.queryText }}"</p>
                <p class="text-micro text-[var(--color-text-faint)] mt-0.5">{{ q.role === 'creator' ? 'Creador' : 'Partner' }} · {{ relativeTime(q.createdAt) }}</p>
              </div>
              <span class="shrink-0 text-micro text-[var(--color-text-faint)]">{{ q.resultsCount }} resultado{{ q.resultsCount === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </BaseCard>
      </div>

      <div v-else-if="tab === 'platform'" class="flex flex-col gap-6" data-admin-platform>
        <CollabInsights scope="platform" :metrics="platform?.metrics ?? null" :range="platformRange" :loading="loadingPlatform" :error="platformError" @update:range="setPlatformRange" @retry="loadPlatform" />
        <BaseCard v-if="platform?.accounts.length" radius="lg" padding="lg">
          <p class="text-sm font-medium text-[var(--color-text)] mb-1">Actividad y fiabilidad por cuenta</p>
          <p class="text-micro text-[var(--color-text-faint)] mb-3">Mismo cálculo que ve cada usuario en «Resultados». «—» significa que no hay datos suficientes. Las terminaciones son las declaradas, no las acreditadas.</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm" data-accounts-table>
              <thead>
                <tr class="text-left text-micro text-[var(--color-text-faint)]">
                  <th class="py-2 pr-3 font-medium">Cuenta</th><th class="py-2 px-2 font-medium">Iniciadas</th><th class="py-2 px-2 font-medium">Completadas</th>
                  <th class="py-2 px-2 font-medium">Éxito</th><th class="py-2 px-2 font-medium">A tiempo</th><th class="py-2 px-2 font-medium">Responde en</th>
                  <th class="py-2 px-2 font-medium">Valoración</th><th class="py-2 px-2 font-medium">Canceladas</th><th class="py-2 pl-2 font-medium">Incumpl. en contra</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in platform.accounts" :key="a.profileId" class="border-t border-[var(--color-hairline)]">
                  <td class="py-2 pr-3"><span class="text-[var(--color-text)]">{{ a.name }}</span> <span class="text-micro text-[var(--color-text-faint)]">{{ a.role === 'creator' ? 'creador' : 'marca' }}</span></td>
                  <td class="py-2 px-2 tabular-nums">{{ a.started }}</td><td class="py-2 px-2 tabular-nums">{{ a.completed }}</td>
                  <td class="py-2 px-2 tabular-nums">{{ formatPct(a.successRate) }}</td><td class="py-2 px-2 tabular-nums">{{ formatPct(a.onTimeRate) }}</td>
                  <td class="py-2 px-2 tabular-nums">{{ formatHours(a.responseHours) }}</td><td class="py-2 px-2 tabular-nums">{{ formatDecimal(a.rating) }}</td>
                  <td class="py-2 px-2 tabular-nums">{{ a.cancelled }}</td><td class="py-2 pl-2 tabular-nums">{{ a.terminatedAgainstMe }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>

      <AdminReportsTab v-else-if="tab === 'reports'" :key="`r${tabKey}`" :actor-role="actorRole" :member-id="memberId" @changed="loadOverview" />

      <AdminTeamTab v-else-if="tab === 'team'" :key="`t${tabKey}`" :member-id="memberId" :shared-login="me.sharedLogin" />
    </div>
    <ConfirmDialogHost />
    <ToastHost />
  </div>
</template>

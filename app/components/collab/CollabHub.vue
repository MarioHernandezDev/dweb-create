<script setup lang="ts">
import { collaborationStatusMeta } from '~/utils/status'
import { COLLAB_PHASES, formatMoney } from '~/utils/collab-phase'
import { toCsv, downloadCsv } from '~/utils/csv'
import { buildIcs, downloadIcs } from '~/utils/ics'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { HubItem } from '~/composables/useCollabHub'

/**
 * «Colaboraciones» (los dos roles): cabecera con el resumen de las activas, y cuatro vistas del mismo conjunto —
 * Tablero por fases, Lista agrupada, Calendario de entregas y Solicitudes (pendientes e historial). Las fases se
 * deducen de los datos reales (utils/collab-phase.ts); ni se arrastran ni se editan: avanzan solas al trabajar.
 */
const props = defineProps<{ role: 'creator' | 'partner' }>()
const isPartner = props.role === 'partner'
const route = useRoute()
const router = useRouter()

const { items, load } = useCollabHub(props.role)
const toast = useToast()
const { paymentsEnabled } = useLaunchMode()
await load()

// Qué toca en cada colaboración (misma lógica que «Qué me toca»).
const work = useMyWork()
onMounted(() => work.refreshIfStale(15_000))
const fallbackHint = (c: HubItem) =>
  c.status !== 'requested' ? null : c.initiatedBy === props.role ? { text: `Esperando al ${isPartner ? 'creador' : 'partner'}`, tone: 'waiting' as const } : { text: 'Te toca responder', tone: 'action' as const }
const hintOf = (c: HubItem) => work.hintFor(c.id) ?? fallbackHint(c)

const who = isPartner ? { one: 'creador', all: 'Todos los creadores', cobro: 'Por pagar', cobrado: 'Pagado', cobroCol: 'Pago' } : { one: 'marca', all: 'Todas las marcas', cobro: 'Por cobrar', cobrado: 'Cobrado', cobroCol: 'Cobro' }

// ---- Vistas (en la URL: ?vista=tablero|lista|calendario|solicitudes). `?tab=` es el enlace antiguo. ----
type View = 'tablero' | 'lista' | 'calendario' | 'solicitudes'
const ACTIVE = ['accepted', 'in_progress', 'completed']
const active = computed(() => items.value.filter((i) => ACTIVE.includes(i.status)))
const requests = computed(() => items.value.filter((i) => !ACTIVE.includes(i.status)))
const pending = computed(() => requests.value.filter((i) => i.status === 'requested'))
const history = computed(() => requests.value.filter((i) => i.status !== 'requested'))

function initialView(): View {
  const v = route.query.vista
  if (v === 'tablero' || v === 'lista' || v === 'calendario' || v === 'solicitudes') return v
  const legacy = route.query.tab
  if (legacy === 'pending' || legacy === 'history') return 'solicitudes'
  if (legacy === 'active') return 'tablero'
  return pending.value.length && !active.value.length ? 'solicitudes' : 'tablero'
}
const view = ref<View>(initialView())
function setView(v: string) {
  view.value = v as View
  router.replace({ query: { ...route.query, vista: v, tab: undefined } })
}
const viewOptions = computed(() => [
  { value: 'tablero', label: 'Tablero' },
  { value: 'lista', label: 'Lista' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'solicitudes', label: pending.value.length ? `Solicitudes (${pending.value.length})` : 'Solicitudes' }
])

// ---- Filtros ----
const counterpartFilter = ref('')
const search = ref('')
const sort = ref<'due' | 'amount' | 'recent'>('due')
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const counterparts = computed(() => [...new Set(items.value.map((i) => i.counterpart))].sort((a, b) => a.localeCompare(b)))

function applyFilters(list: HubItem[]) {
  const q = norm(search.value.trim())
  const out = list.filter((i) => (!counterpartFilter.value || i.counterpart === counterpartFilter.value) && (!q || norm(`${i.title} ${i.counterpart} ${i.brief}`).includes(q)))
  const far = '9999-12-31'
  return out.sort((a, b) => sort.value === 'amount'
    ? (b.budgetCents ?? 0) - (a.budgetCents ?? 0)
    : sort.value === 'recent' ? b.createdAt.localeCompare(a.createdAt) : (a.dueDate ?? far).localeCompare(b.dueDate ?? far))
}
const activeShown = computed(() => applyFilters(active.value))
const pendingShown = computed(() => applyFilters(pending.value))
const historyShown = computed(() => applyFilters(history.value))
const filtering = computed(() => !!counterpartFilter.value || !!search.value.trim())

// ---- Cabecera: resumen de las activas ----
const inProgress = computed(() => active.value.filter((i) => i.status !== 'completed'))
const people = computed(() => {
  const seen = new Map<string, string>()
  for (const i of inProgress.value) seen.set(i.counterpart, i.counterpart)
  return [...seen.values()]
})
const delivProgress = computed(() => {
  let done = 0
  let total = 0
  for (const i of inProgress.value) {
    const p = work.progressFor(i.id)
    if (p) { done += p.done; total += p.total } else { total += i.posts.length; done += i.posts.filter((x) => x.status === 'published').length }
  }
  return total ? { done, total, pct: Math.round((done / total) * 100) } : null
})

// ---- Importes y próximas entregas (solo de colaboraciones reales) ----
const sum = (list: HubItem[]) => list.reduce((s, i) => s + (i.budgetCents ?? 0), 0)
const unpaid = computed(() => active.value.filter((i) => i.payment === 'pending'))
const paid = computed(() => active.value.filter((i) => i.payment === 'paid'))
const soon = computed(() => active.value.flatMap((i) => i.posts.filter((p) => p.status !== 'published' && p.dueInDays >= 0 && p.dueInDays <= 7)))
const soonUntil = computed(() => {
  const last = [...soon.value].sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0]
  return last ? new Date(`${last.dueDate}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : null
})

// ---- Calendario: las publicaciones de las colaboraciones activas ----
const calendarPosts = computed(() => activeShown.value.flatMap((i) => i.posts))
const collabOfPost = (postId: string) => active.value.find((i) => i.posts.some((p) => p.id === postId))
function openFromCalendar(post: { id: string }) {
  const c = collabOfPost(post.id)
  if (c) navigateTo(`/${props.role}/collaborations/${c.id}`)
}

// ---- Fechas de entrega a un calendario externo (.ics) ----
function exportIcs() {
  const events = activeShown.value.flatMap((c) => c.posts.filter((p) => !!p.dueDate).map((p) => ({
    uid: `post-${p.id}`, date: p.dueDate.slice(0, 10), title: `Entrega: ${p.title} (${c.counterpart})`,
    description: `Colaboración «${c.title}» en CIBERAN`, url: `${window.location.origin}/${props.role}/collaborations/${c.id}`
  })))
  downloadIcs('ciberan-entregas.ics', buildIcs(events, 'CIBERAN · Entregas'))
  toast.success(`${events.length} fecha${events.length === 1 ? '' : 's'} de entrega en el archivo: ábrelo para añadirlas a tu calendario`)
}

// ---- CSV de lo que se ve ----
function exportCsv() {
  const list = view.value === 'solicitudes' ? [...pendingShown.value, ...historyShown.value] : activeShown.value
  const rows = list.map((c) => [
    c.counterpart, c.title, collaborationStatusMeta[c.status].label, COLLAB_PHASES.find((p) => p.value === c.phase)?.label ?? '',
    c.budgetCents != null ? c.budgetCents / 100 : '', c.payment === 'paid' ? 'Pagado' : c.payment === 'pending' ? 'Por pagar' : '',
    c.createdAt.slice(0, 10), c.expiresAt?.slice(0, 10) ?? '', c.dueDate ?? '', c.scopeNotes ?? '', c.usageRights ?? ''
  ])
  downloadCsv(`colaboraciones-${view.value}.csv`, toCsv([isPartner ? 'Creador' : 'Marca', 'Colaboración', 'Estado', 'Fase', 'Importe (€)', 'Pago', 'Creada', 'Caduca', 'Próxima entrega', 'Entregables', 'Uso del contenido'], rows))
}
</script>

<template>
  <div class="hub">
    <!-- Cabecera: las colaboraciones en marcha de un vistazo -->
    <!-- Solo con colaboraciones en marcha y fuera de «Solicitudes»: antes decía «activas · en curso» incluso con
         el listado vacío o sobre la pestaña de solicitudes pendientes, y escondía aquí el filtro por marca/creador. -->
    <section v-if="view !== 'solicitudes' && active.length" class="hub__head" aria-label="Resumen">
      <span class="hub__icon" aria-hidden="true"><Icon name="ph:handshake-fill" class="size-6" /></span>
      <div class="hub__title">
        <h2>Colaboraciones activas <span class="hub__chip">En curso</span></h2>
        <p class="hub__sub">{{ inProgress.length }} en marcha<template v-if="active.length > inProgress.length"> · {{ active.length - inProgress.length }} completada{{ active.length - inProgress.length === 1 ? '' : 's' }}</template></p>
      </div>
      <div v-if="people.length" class="hub__people" :aria-label="`${people.length} ${who.one === 'marca' ? 'marcas' : 'creadores'} en curso`">
        <BaseAvatar v-for="n in people.slice(0, 4)" :key="n" :initials="initialsFromName(n)" :hue="hueFromString(n)" size="sm" :title="n" />
        <span v-if="people.length > 4" class="hub__more">+{{ people.length - 4 }}</span>
      </div>
      <div v-if="delivProgress" class="hub__progress">
        <p><span>Entregables</span><strong>{{ delivProgress.pct }}%</strong></p>
        <span class="hub__bar" role="progressbar" :aria-valuenow="delivProgress.pct" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${delivProgress.pct}%` }" /></span>
      </div>
    </section>

    <div class="hub__bar-row">
      <SegmentedTabs :model-value="view" :options="viewOptions" label="Vista de las colaboraciones" @update:model-value="setView" />
      <!-- Sin ninguna colaboración, buscar / ordenar / exportar no tienen nada que hacer: se esconden. -->
      <div v-if="items.length" class="hub__tools">
        <label class="hub__search">
          <Icon name="ph:magnifying-glass-bold" class="size-4" />
          <span class="sr-only">Buscar colaboración</span>
          <input v-model="search" type="search" placeholder="Buscar colaboración…">
        </label>
        <label v-if="counterparts.length > 1" class="hub__select hub__select--pill">
          <span class="sr-only">Filtrar por {{ who.one }}</span>
          <select v-model="counterpartFilter" :aria-label="`Filtrar por ${who.one}`" data-counterpart-filter>
            <option value="">{{ who.all }}</option>
            <option v-for="c in counterparts" :key="c" :value="c">{{ c }}</option>
          </select>
          <Icon name="ph:caret-down-bold" class="size-3.5" />
        </label>
        <label v-if="view !== 'solicitudes' && view !== 'calendario'" class="hub__select hub__select--pill">
          <span class="sr-only">Ordenar</span>
          <select v-model="sort" aria-label="Ordenar">
            <option value="due">Ordenar: fecha de entrega</option>
            <option value="amount">Ordenar: importe</option>
            <option value="recent">Ordenar: más recientes</option>
          </select>
          <Icon name="ph:caret-down-bold" class="size-3.5" />
        </label>
        <BaseButton v-if="view === 'calendario'" variant="outline" size="sm" icon="ph:calendar-plus-bold" :disabled="!calendarPosts.some((p) => !!p.dueDate)" data-export-ics @click="exportIcs">Añadir a mi calendario</BaseButton>
        <BaseButton variant="outline" size="sm" icon="ph:download-simple-bold" data-export-csv @click="exportCsv">Exportar CSV</BaseButton>
      </div>
    </div>

    <!-- TABLERO -->
    <template v-if="view === 'tablero'">
      <EmptyState
        v-if="!activeShown.length" icon="ph:handshake" :mascot="filtering ? undefined : 'sleepy'"
        :title="filtering ? 'Ninguna colaboración con estos filtros' : 'Sin colaboraciones en curso'"
        :description="filtering ? 'Prueba a quitar el buscador o el filtro.' : (paymentsEnabled ? 'Las solicitudes y ofertas que se acepten aparecerán aquí, de la aceptación al pago.' : 'Las solicitudes y ofertas que se acepten aparecerán aquí, de la aceptación a la publicación.')"
      >
        <BaseButton v-if="!filtering && pending.length" variant="primary" size="sm" @click="setView('solicitudes')">Ver {{ pending.length }} solicitud{{ pending.length === 1 ? '' : 'es' }} pendiente{{ pending.length === 1 ? '' : 's' }}</BaseButton>
        <BaseButton v-if="!filtering && !pending.length" :to="`/${role}/discover`" variant="primary" size="sm" icon="ph:compass-bold">{{ isPartner ? 'Descubrir creadores' : 'Descubrir marcas' }}</BaseButton>
        <BaseButton v-if="!filtering && !pending.length && !isPartner" to="/creator/packages" variant="secondary" size="sm" icon="ph:package-bold">Revisar mis paquetes</BaseButton>
      </EmptyState>
      <CollabHubBoard v-else :items="activeShown" :role="role" :progress-for="work.progressFor" :hint-of="hintOf" />
    </template>

    <!-- LISTA -->
    <template v-else-if="view === 'lista'">
      <div class="hub__kpis">
        <div v-if="paymentsEnabled" class="hub__kpi hub__kpi--ink"><p>{{ who.cobro }}</p><strong>{{ formatMoney(sum(unpaid)) }}</strong><small>{{ unpaid.length }} colaboración{{ unpaid.length === 1 ? '' : 'es' }} sin {{ isPartner ? 'pagar' : 'cobrar' }}</small></div>
        <div v-if="paymentsEnabled" class="hub__kpi hub__kpi--volt"><p>{{ who.cobrado }}</p><strong>{{ formatMoney(sum(paid)) }}</strong><small>{{ paid.length }} colaboración{{ paid.length === 1 ? '' : 'es' }}</small></div>
        <div class="hub__kpi"><p>Entregas en los próximos 7 días</p><strong>{{ soon.length }}</strong><small>{{ soonUntil ? `hasta el ${soonUntil}` : 'ninguna prevista' }}</small></div>
      </div>
      <EmptyState
        v-if="!activeShown.length" icon="ph:handshake" :mascot="filtering ? undefined : 'sleepy'"
        :title="filtering ? 'Ninguna colaboración con estos filtros' : 'Sin colaboraciones en curso'"
        :description="filtering ? 'Prueba a quitar el buscador o el filtro.' : 'Aquí verás cada colaboración agrupada por fase.'"
      >
        <BaseButton v-if="!filtering && !pending.length" :to="`/${role}/discover`" variant="primary" size="sm" icon="ph:compass-bold">{{ isPartner ? 'Descubrir creadores' : 'Descubrir marcas' }}</BaseButton>
        <BaseButton v-if="!filtering && !pending.length && !isPartner" to="/creator/packages" variant="secondary" size="sm" icon="ph:package-bold">Revisar mis paquetes</BaseButton>
      </EmptyState>
      <CollabHubList v-else :items="activeShown" :role="role" :progress-for="work.progressFor" :pay-label="who.cobroCol" />
    </template>

    <!-- CALENDARIO -->
    <template v-else-if="view === 'calendario'">
      <p class="hub__note">Fechas de entrega de las publicaciones de tus colaboraciones activas.</p>
      <PostCalendar :posts="calendarPosts" @open="openFromCalendar" />
    </template>

    <!-- SOLICITUDES -->
    <template v-else>
      <EmptyState
        v-if="!pendingShown.length && !historyShown.length" icon="ph:handshake" :mascot="filtering ? undefined : 'sleepy'"
        :title="filtering ? 'Ninguna solicitud con estos filtros' : 'Sin solicitudes'"
        :description="isPartner ? 'Contacta a un creador desde «Descubrir», o espera a que te encuentren ellos.' : 'Cuando contactes a una marca (o te contacten) desde «Descubrir», aparecerá aquí.'"
      >
        <BaseButton v-if="!filtering" :to="`/${role}/discover`" variant="primary" size="sm" icon="ph:compass-bold">{{ isPartner ? 'Descubrir creadores' : 'Descubrir marcas' }}</BaseButton>
      </EmptyState>
      <section v-if="pendingShown.length" class="hub__section" aria-labelledby="hub-pending">
        <h2 id="hub-pending" class="hub__h">Pendientes <span class="hub__count">{{ pendingShown.length }}</span></h2>
        <div class="collab-grid">
          <CollabCard
            v-for="c in pendingShown" :key="c.id"
            :name="c.counterpart" :status="c.status" :campaign="c.campaignName" :brief="c.brief" :budget-cents="c.budgetCents" :created-at="c.createdAt" :expires-at="c.expiresAt"
            :hint="hintOf(c)?.text" :hint-tone="hintOf(c)?.tone" @open="navigateTo(`/${role}/collaborations/${c.id}`)"
          />
        </div>
      </section>
      <section v-if="historyShown.length" class="hub__section" aria-labelledby="hub-history">
        <h2 id="hub-history" class="hub__h">Historial <span class="hub__count">{{ historyShown.length }}</span></h2>
        <div class="collab-grid">
          <CollabCard
            v-for="c in historyShown" :key="c.id"
            :name="c.counterpart" :status="c.status" :campaign="c.campaignName" :brief="c.brief" :budget-cents="c.budgetCents" :created-at="c.createdAt"
            @open="navigateTo(`/${role}/collaborations/${c.id}`)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

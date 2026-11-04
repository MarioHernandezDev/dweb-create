<script setup lang="ts">
useHead({ title: 'Colaboraciones' })

// Cada colaboración tiene su propia página (`/creator/collaborations/[id]`). Los
// enlaces antiguos (avisos, chat) siguen apuntando a `?collaboration=<id>` y se
// reenvían allí conservando el resto de parámetros (`post`…).
const route = useRoute()
const target = route.query.collaboration
if (typeof target === 'string') {
  const { collaboration: _omit, ...rest } = route.query
  await navigateTo({ path: `/creator/collaborations/${target}`, query: rest }, { replace: true })
}

const { requests, pendingCount, ensureLoaded } = useCollabRequests()
await ensureLoaded()

// Qué toca en cada colaboración (la misma lógica que «Qué me toca»): se calcula en el cliente.
const work = useMyWork()
onMounted(() => work.refreshIfStale(15_000))

// Hasta que se calcula lo de arriba, solo lo evidente: quién debe responder a una solicitud.
const fallbackHint = (c: { status: string; initiatedBy: string }) =>
  c.status !== 'requested' ? null : c.initiatedBy === 'partner' ? { text: 'Te toca responder', tone: 'action' as const } : { text: 'Esperando al partner', tone: 'waiting' as const }
const hintOf = (c: { id: string; status: string; initiatedBy: string }) => work.hintFor(c.id) ?? fallbackHint(c)

// Tres grupos: lo que espera respuesta, lo que está en marcha (aceptadas y en curso) y lo ya cerrado.
type RequestsTab = 'pending' | 'active' | 'history'
const ACTIVE_STATUSES = ['accepted', 'in_progress']
const tab = ref<RequestsTab>('pending')
const tabs = computed(() => [
  { value: 'pending', label: pendingCount.value ? `Pendientes (${pendingCount.value})` : 'Pendientes' },
  { value: 'active', label: 'En curso' },
  { value: 'history', label: 'Historial' }
])

const newestFirst = (list: typeof requests.value) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

const pending = computed(() => newestFirst(requests.value.filter((r) => r.status === 'requested')))
const active = computed(() => newestFirst(requests.value.filter((r) => ACTIVE_STATUSES.includes(r.status))))
const history = computed(() => newestFirst(requests.value.filter((r) => r.status !== 'requested' && !ACTIVE_STATUSES.includes(r.status))))
const visible = computed(() => (tab.value === 'pending' ? pending.value : tab.value === 'active' ? active.value : history.value))

// Pestaña inicial: la de la URL (`?tab=`); si no, la que tenga contenido.
const queryTab = route.query.tab
tab.value = queryTab === 'active' || queryTab === 'history' || queryTab === 'pending'
  ? queryTab
  : (pending.value.length || !active.value.length ? 'pending' : 'active')
</script>

<template>
  <AppShell role="creator" title="Colaboraciones" subtitle="Tus colaboraciones con partners">
    <div class="collab-toolbar"><SegmentedTabs v-model="tab" :options="tabs" /></div>

    <EmptyState
      v-if="!visible.length && tab === 'pending'"
      icon="ph:handshake" title="Sin solicitudes pendientes"
      description="Cuando contactes a un partner (o te contacten a ti) desde 'Descubrir', aparecerá aquí."
    />
    <EmptyState
      v-else-if="!visible.length && tab === 'active'"
      icon="ph:handshake" title="Sin colaboraciones en curso"
      description="Las solicitudes y ofertas que aceptes aparecerán aquí hasta que se completen."
    />
    <EmptyState
      v-else-if="!visible.length"
      icon="ph:clock-counter-clockwise" title="Todavía no hay historial"
      description="Las colaboraciones completadas y las solicitudes rechazadas se guardan aquí."
    />

    <div v-else class="collab-grid">
      <CollabCard
        v-for="req in visible" :key="req.id"
        :name="req.partnerName" :status="req.status" :brief="req.brief" :budget-cents="req.budgetCents" :created-at="req.createdAt"
        :hint="hintOf(req)?.text" :hint-tone="hintOf(req)?.tone" :progress="work.progressFor(req.id)"
        @open="navigateTo(`/creator/collaborations/${req.id}`)"
      />
    </div>
  </AppShell>
</template>

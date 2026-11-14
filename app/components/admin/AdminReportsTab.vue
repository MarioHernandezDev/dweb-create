<script setup lang="ts">
import { type AdminRole, COLLAB_STATUS_LABELS, QUICK_NOTES, REASON_LABELS, REPORT_STATUS_LABELS, ageLabel, canDo, errorText, formatDate } from '~/utils/admin-labels'

interface ReportItem {
  id: string; reason: string; detail: string | null; createdAt: string; status: 'open' | 'reviewing' | 'resolved' | 'dismissed'; adminNote: string | null; resolvedAt: string | null
  assignedTo: string | null; assignedName: string | null; reporterName: string; reporterRole: string | null; reporterProfileId: string
  collaborationId: string | null; collaborationBrief: string | null; collaborationStatus: string | null; budgetCents: number | null; paid: boolean
  creatorName: string | null; partnerName: string | null; reportedName: string | null; reportedProfileId: string | null
}
interface DeletionItem {
  id: string; profileId: string; reason: string | null; status: 'pending' | 'cancelled' | 'done'; createdAt: string; resolvedAt: string | null
  assignedTo: string | null; assignedName: string | null; name: string; role: string | null; email: string | null
}

const props = defineProps<{ actorRole: AdminRole | null; memberId: string | null }>()
const emit = defineEmits<{ changed: [] }>()

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()
const toast = useToast()
const canAct = computed(() => canDo(props.actorRole, 'moderator'))

const view = ref<'reports' | 'deletions'>(route.query.r_view === 'deletions' ? 'deletions' : 'reports')
function setView(v: string) {
  view.value = v === 'deletions' ? 'deletions' : 'reports'
  router.replace({ query: { ...route.query, r_view: view.value === 'deletions' ? 'deletions' : undefined } })
  if (view.value === 'deletions' && !deletionsLoaded) { deletionsLoaded = true; deletions.load() }
}

const reports = useAdminList<ReportItem>({
  endpoint: '/api/admin/reports', prefix: 'r_', dataKey: 'reports', pageSize: 20,
  defaults: { status: 'pending', reason: '', assigned: '', q: '', sort: '', profile: '' }
})
const deletions = useAdminList<DeletionItem>({
  endpoint: '/api/admin/deletion-requests', prefix: 'd_', dataKey: 'requests', pageSize: 20, defaults: { status: 'pending' }
})
let deletionsLoaded = false

const members = ref<{ id: string; name: string }[]>([])
onMounted(async () => {
  if (view.value === 'deletions') { deletionsLoaded = true; deletions.load() } else reports.load()
  if (!canAct.value) return
  const res = await $fetch<{ members?: { id: string; name: string }[] }>('/api/admin/team-options').catch(() => null)
  members.value = Array.isArray(res?.members) ? res.members : []
})

const notes = reactive<Record<string, string>>({})
const saving = ref<string | null>(null)
const error = ref('')

async function patchReport(r: ReportItem, body: Record<string, unknown>) {
  error.value = ''
  saving.value = r.id
  try {
    const res = await $fetch<{ status: ReportItem['status']; admin_note: string | null; resolved_at: string | null; assignedTo: string | null; assignedName: string | null }>(`/api/admin/reports/${r.id}`, { method: 'PATCH', body })
    r.status = res.status; r.adminNote = res.admin_note; r.resolvedAt = res.resolved_at; r.assignedTo = res.assignedTo; r.assignedName = res.assignedName
    emit('changed')
    // Si ya no encaja con el filtro (p. ej. resuelto en «Por revisar») se vuelve a pedir la lista.
    if (reports.filters.status === 'pending' && (r.status === 'resolved' || r.status === 'dismissed')) reports.load()
  } catch (e) {
    error.value = errorText(e, 'No se ha podido guardar el cambio.')
  } finally {
    saving.value = null
  }
}
const setStatus = (r: ReportItem, status: ReportItem['status']) => patchReport(r, { status, note: notes[r.id] ?? r.adminNote ?? '' })
const assign = (r: ReportItem, value: string) => patchReport(r, { assignedTo: value || 'none' })

// ---- selección y acciones en lote ----
const selected = ref<string[]>([])
const bulkNote = ref('')
const bulkAssignee = ref('')
const bulkBusy = ref(false)
watch(reports.items, () => { selected.value = [] })
const allSelected = computed(() => reports.items.value.length > 0 && selected.value.length === reports.items.value.length)
function toggleAll() { selected.value = allSelected.value ? [] : reports.items.value.map((r) => r.id) }

async function bulk(action: 'review' | 'dismiss' | 'resolve' | 'assign') {
  if (!selected.value.length || bulkBusy.value) return
  if (action === 'dismiss' || action === 'resolve') {
    const ok = await confirm({
      title: `¿${action === 'dismiss' ? 'Desestimar' : 'Resolver'} ${selected.value.length} reporte${selected.value.length === 1 ? '' : 's'}?`,
      message: 'Se aplicará la misma nota a todos.', confirmLabel: action === 'dismiss' ? 'Desestimar' : 'Resolver'
    })
    if (!ok) return
  }
  bulkBusy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ updated: number }>('/api/admin/reports/bulk', { method: 'POST', body: { ids: selected.value, action, note: bulkNote.value, assignedTo: bulkAssignee.value || null } })
    toast.success(`${res.updated} reporte${res.updated === 1 ? '' : 's'} actualizado${res.updated === 1 ? '' : 's'}`)
    bulkNote.value = ''
    selected.value = []
    emit('changed')
    await reports.load()
  } catch (e) {
    error.value = errorText(e, 'No se ha podido aplicar la acción.')
  } finally {
    bulkBusy.value = false
  }
}

// ---- solicitudes de eliminación ----
async function patchDeletion(d: DeletionItem, body: Record<string, unknown>, done: string) {
  error.value = ''
  saving.value = d.id
  try {
    await $fetch(`/api/admin/deletion-requests/${d.id}`, { method: 'PATCH', body })
    toast.success(done)
    emit('changed')
    await deletions.load()
  } catch (e) {
    error.value = errorText(e, 'No se ha podido guardar el cambio.')
  } finally {
    saving.value = null
  }
}
async function resolveDeletion(d: DeletionItem, status: 'done' | 'cancelled') {
  const ok = await confirm({
    title: status === 'done' ? `¿Marcar como atendida la solicitud de ${d.name}?` : `¿Descartar la solicitud de ${d.name}?`,
    message: status === 'done' ? 'Hazlo solo si ya has atendido la petición. Para borrar o anonimizar la cuenta usa «Abrir ficha» → «Eliminar cuenta», que la marca sola.' : 'La cuenta seguirá activa.',
    confirmLabel: status === 'done' ? 'Marcar atendida' : 'Descartar'
  })
  if (ok) await patchDeletion(d, { status }, status === 'done' ? 'Solicitud atendida' : 'Solicitud descartada')
}
</script>

<template>
  <div class="flex flex-col gap-3" data-admin-reports>
    <SegmentedTabs :model-value="view" :options="[{ value: 'reports', label: 'Reportes' }, { value: 'deletions', label: 'Eliminaciones de cuenta' }]" label="Bandeja" class="self-start" @update:model-value="setView" />
    <p v-if="error" class="text-sm text-[var(--color-status-alert)]" role="alert">{{ error }}</p>

    <!-- ===================== REPORTES ===================== -->
    <template v-if="view === 'reports'">
      <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="relative sm:col-span-2 lg:col-span-4">
          <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-faint)]" />
          <label class="sr-only" for="r-q">Buscar reportes</label>
          <input id="r-q" v-model="reports.filters.q" type="search" class="input w-full pl-9" placeholder="Buscar por persona, marca, texto del reporte o de la colaboración…">
        </div>
        <label class="sr-only" for="r-status">Estado</label>
        <select id="r-status" v-model="reports.filters.status" class="select">
          <option value="pending">Por revisar</option><option value="open">Abiertos</option><option value="reviewing">En revisión</option>
          <option value="resolved">Resueltos</option><option value="dismissed">Desestimados</option><option value="all">Todos</option>
        </select>
        <label class="sr-only" for="r-reason">Motivo</label>
        <select id="r-reason" v-model="reports.filters.reason" class="select">
          <option value="">Cualquier motivo</option><option v-for="(label, k) in REASON_LABELS" :key="k" :value="k">{{ label }}</option>
        </select>
        <label class="sr-only" for="r-assigned">Responsable</label>
        <select id="r-assigned" v-model="reports.filters.assigned" class="select">
          <option value="">Cualquier responsable</option><option value="none">Sin asignar</option><option v-if="memberId" value="me">Asignados a mí</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <label class="sr-only" for="r-sort">Orden</label>
        <select id="r-sort" v-model="reports.filters.sort" class="select"><option value="">Orden automático</option><option value="oldest">Más antiguos primero</option><option value="newest">Más recientes primero</option></select>
      </div>
      <div v-if="reports.filters.profile" class="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <span>Solo reportes de una cuenta</span><BaseButton variant="ghost" size="sm" icon="ph:x-bold" @click="reports.filters.profile = ''">Quitar</BaseButton>
      </div>

      <div v-if="canAct && reports.items.value.length" class="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-hairline)] p-3" data-admin-bulk>
        <label class="flex items-center gap-2 text-sm text-[var(--color-text)]"><input type="checkbox" :checked="allSelected" @change="toggleAll"> Seleccionar los {{ reports.items.value.length }} de esta página</label>
        <template v-if="selected.length">
          <span class="text-sm font-medium text-[var(--color-text)]" data-admin-bulk-count>{{ selected.length }} elegido{{ selected.length === 1 ? '' : 's' }}</span>
          <div class="grid gap-2 w-full">
            <label class="sr-only" for="bulk-note">Nota común</label>
            <textarea id="bulk-note" v-model="bulkNote" class="input w-full" rows="2" maxlength="2000" placeholder="Nota común (obligatoria para resolver o desestimar)" />
            <div class="flex flex-wrap gap-1.5"><Chip v-for="n in QUICK_NOTES" :key="n.label" size="sm" outline @click="bulkNote = n.text">{{ n.label }}</Chip></div>
            <div class="flex flex-wrap items-center gap-2">
              <BaseButton variant="outline" size="sm" :loading="bulkBusy" @click="bulk('review')">Pasar a revisión</BaseButton>
              <BaseButton variant="outline" size="sm" :loading="bulkBusy" @click="bulk('dismiss')">Desestimar</BaseButton>
              <BaseButton variant="primary" size="sm" :loading="bulkBusy" @click="bulk('resolve')">Resolver</BaseButton>
              <label class="sr-only" for="bulk-assignee">Asignar a</label>
              <select id="bulk-assignee" v-model="bulkAssignee" class="select h-9 w-auto"><option value="">Sin asignar</option><option v-if="memberId" :value="memberId">Yo</option><option v-for="m in members.filter((x) => x.id !== memberId)" :key="m.id" :value="m.id">{{ m.name }}</option></select>
              <BaseButton variant="secondary" size="sm" :loading="bulkBusy" @click="bulk('assign')">Asignar</BaseButton>
            </div>
          </div>
        </template>
      </div>

      <EmptyState v-if="!reports.loading.value && !reports.items.value.length && !reports.error.value" icon="ph:flag" title="Nada en este filtro" description="Los reportes de solicitudes y las terminaciones por incumplimiento aparecen aquí." />
      <p v-if="reports.error.value" class="text-sm text-[var(--color-status-alert)]" role="alert">{{ reports.error.value }}</p>

      <BaseCard v-for="report in reports.items.value" :key="report.id" radius="lg" padding="md" data-report :data-status="report.status">
        <div class="flex items-start gap-3 mb-2">
          <input v-if="canAct" v-model="selected" type="checkbox" :value="report.id" class="mt-1" :aria-label="`Elegir el reporte de ${report.reporterName}`">
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium text-[var(--color-status-alert)]">{{ REASON_LABELS[report.reason] ?? report.reason }}</span>
              <span class="text-micro text-[var(--color-text-faint)] text-right">{{ REPORT_STATUS_LABELS[report.status] }} · {{ formatDate(report.createdAt) }}<template v-if="report.status === 'open' || report.status === 'reviewing'"> · hace {{ ageLabel(report.createdAt) }}</template></span>
            </div>
            <p class="text-sm text-[var(--color-text-muted)] mt-1">
              Reportado por <NuxtLink :to="`/admin/users/${report.reporterProfileId}`" class="underline">{{ report.reporterName }}</NuxtLink> ({{ report.reporterRole === 'creator' ? 'creador' : 'partner' }})
              <template v-if="report.reportedName"> contra
                <NuxtLink v-if="report.reportedProfileId" :to="`/admin/users/${report.reportedProfileId}`" class="underline">{{ report.reportedName }}</NuxtLink><template v-else>{{ report.reportedName }}</template></template>
            </p>
          </div>
        </div>
        <p v-if="report.collaborationBrief" class="text-sm text-[var(--color-text)] mb-1">"{{ report.collaborationBrief }}" — {{ report.creatorName }} / {{ report.partnerName }}</p>
        <p v-if="report.detail" class="text-sm text-[var(--color-text-muted)]">{{ report.detail }}</p>
        <p class="text-micro text-[var(--color-text-faint)] mt-2">
          Colaboración: {{ report.collaborationStatus ? (COLLAB_STATUS_LABELS[report.collaborationStatus] ?? report.collaborationStatus) : '—' }}
          <template v-if="report.budgetCents"> · {{ (report.budgetCents / 100).toLocaleString('es-ES') }} € {{ report.paid ? '(pagada en CIBERAN)' : '(sin pago en CIBERAN)' }}</template>
          · Responsable: {{ report.assignedName ?? 'sin asignar' }}
        </p>
        <div class="mt-3 grid gap-2">
          <label class="sr-only" :for="`report-note-${report.id}`">Nota interna</label>
          <textarea
            :id="`report-note-${report.id}`" class="input w-full" rows="2" maxlength="2000" placeholder="Nota interna: qué se ha comprobado y qué se decide" :disabled="!canAct"
            :value="notes[report.id] ?? report.adminNote ?? ''" @input="notes[report.id] = ($event.target as HTMLTextAreaElement).value"
          />
          <template v-if="canAct">
            <div class="flex flex-wrap gap-1.5"><Chip v-for="n in QUICK_NOTES" :key="n.label" size="sm" outline @click="notes[report.id] = n.text">{{ n.label }}</Chip></div>
            <div class="flex flex-wrap items-center gap-2 justify-end">
              <label class="sr-only" :for="`report-assign-${report.id}`">Asignar a</label>
              <select :id="`report-assign-${report.id}`" class="select h-9 w-auto mr-auto" :value="report.assignedTo ?? ''" :disabled="saving === report.id" @change="assign(report, ($event.target as HTMLSelectElement).value)">
                <option value="">Sin asignar</option><option v-if="memberId" :value="memberId">Yo</option><option v-for="m in members.filter((x) => x.id !== memberId)" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
              <BaseButton v-if="report.status === 'open'" variant="outline" size="sm" :loading="saving === report.id" @click="setStatus(report, 'reviewing')">Pasar a revisión</BaseButton>
              <BaseButton v-if="report.status !== 'dismissed'" variant="outline" size="sm" :loading="saving === report.id" @click="setStatus(report, 'dismissed')">Desestimar</BaseButton>
              <BaseButton v-if="report.status !== 'resolved'" variant="primary" size="sm" :loading="saving === report.id" @click="setStatus(report, 'resolved')">Resolver</BaseButton>
              <BaseButton v-if="report.status === 'resolved' || report.status === 'dismissed'" variant="ghost" size="sm" :loading="saving === report.id" @click="setStatus(report, 'reviewing')">Reabrir</BaseButton>
            </div>
          </template>
        </div>
      </BaseCard>
      <AdminPagination :page="reports.page.value" :page-size="reports.pageSize" :total="reports.total.value" :loading="reports.loading.value" @update:page="reports.setPage" />
    </template>

    <!-- ===================== ELIMINACIONES ===================== -->
    <template v-else>
      <p class="text-micro text-[var(--color-text-faint)]">Cuentas con colaboraciones terminadas: no se borran solas. Abre la ficha y usa «Eliminar cuenta» (anonimizar o borrar); la solicitud queda atendida al terminar.</p>
      <label class="sr-only" for="d-status">Estado de la solicitud</label>
      <select id="d-status" v-model="deletions.filters.status" class="select self-start w-auto"><option value="pending">Pendientes</option><option value="done">Atendidas</option><option value="cancelled">Descartadas</option><option value="all">Todas</option></select>
      <EmptyState v-if="!deletions.loading.value && !deletions.items.value.length && !deletions.error.value" icon="ph:trash" title="Sin solicitudes" />
      <p v-if="deletions.error.value" class="text-sm text-[var(--color-status-alert)]" role="alert">{{ deletions.error.value }}</p>
      <BaseCard v-for="d in deletions.items.value" :key="d.id" radius="lg" padding="md" data-deletion-request>
        <div class="flex flex-wrap items-start justify-between gap-2 mb-1">
          <div class="min-w-0">
            <p class="text-sm font-medium text-[var(--color-text)]">{{ d.name }} <span class="text-micro text-[var(--color-text-faint)]">{{ d.role === 'creator' ? 'creador' : 'partner' }}</span></p>
            <p class="text-micro text-[var(--color-text-muted)]">{{ d.email }} · pedida el {{ formatDate(d.createdAt) }}<template v-if="d.status === 'pending'"> · hace {{ ageLabel(d.createdAt) }}</template><template v-else> · {{ d.status === 'done' ? 'atendida' : 'descartada' }} el {{ formatDate(d.resolvedAt) }}</template></p>
          </div>
          <span class="text-micro text-[var(--color-text-faint)]">Responsable: {{ d.assignedName ?? 'sin asignar' }}</span>
        </div>
        <p v-if="d.reason" class="text-sm text-[var(--color-text-muted)]">{{ d.reason }}</p>
        <div class="flex flex-wrap items-center gap-2 mt-3">
          <template v-if="canAct && d.status === 'pending'">
            <label class="sr-only" :for="`del-assign-${d.id}`">Asignar a</label>
            <select :id="`del-assign-${d.id}`" class="select h-9 w-auto" :value="d.assignedTo ?? ''" :disabled="saving === d.id" @change="patchDeletion(d, { assignedTo: ($event.target as HTMLSelectElement).value || 'none' }, 'Responsable actualizado')">
              <option value="">Sin asignar</option><option v-if="memberId" :value="memberId">Yo</option><option v-for="m in members.filter((x) => x.id !== memberId)" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </template>
          <div class="flex flex-wrap gap-2 ml-auto">
            <BaseButton :to="`/admin/users/${d.profileId}`" variant="outline" size="sm" icon="ph:identification-card-bold">Abrir ficha</BaseButton>
            <template v-if="canAct && d.status === 'pending'">
              <BaseButton variant="outline" size="sm" :loading="saving === d.id" @click="resolveDeletion(d, 'cancelled')">Descartar</BaseButton>
              <BaseButton variant="primary" size="sm" :loading="saving === d.id" @click="resolveDeletion(d, 'done')">Marcar atendida</BaseButton>
            </template>
          </div>
        </div>
      </BaseCard>
      <AdminPagination :page="deletions.page.value" :page-size="deletions.pageSize" :total="deletions.total.value" :loading="deletions.loading.value" @update:page="deletions.setPage" />
    </template>
  </div>
</template>

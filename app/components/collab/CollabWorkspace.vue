<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { errorMessage } from '~/utils/error-message'
import { relativeTime } from '~/utils/status'
import { collaborationWork, deliverableState, hasRated, type DeliverableState, type WorkCollab, type WorkTask } from '~/utils/collaboration-work'
import type { CollaborationTerms } from '~/utils/collaboration-terms'
import type { CollaborationStatus } from '~/types'
import { expiryState } from '~/utils/collab-expiry'
import { collabPhase, collabDisplayName, collabBriefExcerpt, paymentState, COLLAB_PHASES } from '~/utils/collab-phase'
import { formatMoney } from '~/utils/money'
import { collaborationStatusMeta } from '~/utils/status'
import { agreementFingerprint, buildAgreementHtml, printHtml, type AgreementData } from '~/utils/agreement-summary'
import { buildIcs } from '~/utils/ics'
import { downloadIcs } from '~/utils/ics-download'

/**
 * Página de una colaboración, para los dos roles (`/creator/collaborations/[id]`
 * y `/partner/collaborations/[id]`). Reúne lo que antes estaba repartido entre
 * una hoja modal y varias pestañas: quién participa, estado, siguiente paso,
 * presupuesto y respuesta, entregables, acuerdo (brief y condiciones) y cronología.
 * Los datos y las acciones son los de siempre (`useCollabRequests` /
 * `useMyCollaborations`, las mismas RPC); aquí no hay lógica de negocio nueva.
 * Aspecto en assets/css/patterns/collab-detail.css.
 */
const props = defineProps<{ role: 'creator' | 'partner'; id: string }>()

const isPartner = props.role === 'partner'
const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()
const creatorSide = useCollabRequests()
const partnerSide = useMyCollaborations()
const { posts: myPosts, ensureLoaded: ensureMyPosts, refresh: refreshMyPosts } = useMyPosts()
const { posts: partnerPosts, hidden: hiddenPosts, ensureLoaded: ensurePartnerPosts, refresh: refreshPartnerPosts } = usePartnerPosts()
const { itemsByPost, ensureItems } = useChecklist()
const { eventsByCollab, error: eventsError, load: loadEvents } = useCollabEvents()
const { byCollab: deliverablesByCollab, load: loadDeliverables } = useCollabDeliverables()
const { resolveMyProfileId } = useMyProfileId()

// Al volver de Stripe (`?payment=`) se fuerza un refresco real: el webhook puede
// haber escrito `paid_at` hace un instante.
// La cronología y mi id se cargan en el mismo viaje (también en el servidor): sin
// ellas el «siguiente paso» se calcularía mal un instante (p. ej. pediría valorar
// una colaboración ya valorada). Al navegar dentro de la app se vuelve a leer, para
// no mostrar una caché anterior; al hidratar se reutiliza la del servidor.
const nuxtApp = useNuxtApp()
const refetchEvents = import.meta.client && !nuxtApp.isHydrating
const myProfileId = ref<string | null>(null)
await Promise.all([
  isPartner
    ? (route.query.payment ? partnerSide.refresh() : partnerSide.ensureLoaded())
    : creatorSide.ensureLoaded(),
  isPartner ? ensurePartnerPosts() : ensureMyPosts(),
  loadEvents(props.id, refetchEvents),
  loadDeliverables(props.id, refetchEvents),
  resolveMyProfileId().then((id) => { myProfileId.value = id })
])

interface View extends CollaborationTerms {
  id: string
  status: CollaborationStatus
  brief: string
  budgetCents: number | null
  paidAt: string | null
  createdAt: string
  expiresAt: string | null
  initiatedBy: 'creator' | 'partner'
  counterpartName: string
  counterpartProfileId: string | null
  packageTitle: string | null
  packageDescription: string | null
  packageDeliverables: string[] | null
}

const view = computed<View | null>(() => {
  if (isPartner) {
    const c = partnerSide.collaborations.value.find((x) => x.id === props.id)
    return c ? { ...c, counterpartName: c.creatorName ?? 'el creador', counterpartProfileId: c.creatorProfileId } : null
  }
  const c = creatorSide.requests.value.find((x) => x.id === props.id)
  return c ? { ...c, counterpartName: c.partnerName, counterpartProfileId: c.partnerProfileId } : null
})

// La lista cacheada puede ser anterior a esta colaboración (p. ej. recién aceptada
// desde el chat): una lectura nueva antes de darla por inexistente.
const notFound = ref(false)
if (!view.value) {
  await (isPartner ? partnerSide.refresh() : creatorSide.refresh())
  notFound.value = !view.value
}

const expiry = computed(() => expiryState(view.value?.status ?? '', view.value?.expiresAt))

// Fase, título y resumen de lo acordado (todo deducido de datos reales; ver utils/collab-phase.ts).
const phase = computed(() => (view.value ? collabPhase(view.value, collabPosts.value, isPartner ? hiddenPosts.value[view.value.id] : null) : null))
const phaseLabel = computed(() => COLLAB_PHASES.find((p) => p.value === phase.value)?.label ?? null)
const title = computed(() => (view.value ? collabDisplayName(view.value, view.value.counterpartName) : ''))
const briefExcerpt = computed(() => (view.value ? collabBriefExcerpt(view.value, title.value) : null))
const { paymentsEnabled } = useLaunchMode()
const payment = computed(() => (view.value ? paymentState(view.value, paymentsEnabled) : 'none' as const))
const payLabel = isPartner ? 'Pago' : 'Cobro'
const finalDue = computed(() => {
  const dates = collabPosts.value.map((p) => p.dueDate).filter(Boolean).sort()
  return dates[dates.length - 1] ?? null
})
const acceptedOn = computed(() => events.value.find((e) => e.kind === 'accepted')?.createdAt ?? null)
const deliverablesText = computed(() => view.value?.scopeNotes || (collabDeliverables.value.length ? `${collabDeliverables.value.length} entregable${collabDeliverables.value.length === 1 ? '' : 's'}` : null))

const posts = computed(() => (isPartner ? partnerPosts.value : myPosts.value))
const events = computed(() => eventsByCollab.value[props.id] ?? [])

async function reloadEvents() {
  await loadEvents(props.id, true)
}
// Tras una acción sobre entregables o revisiones cambian el hueco, la publicación y la cronología.
async function reloadAll() {
  await Promise.all([loadEvents(props.id, true), loadDeliverables(props.id, true), isPartner ? refreshPartnerPosts() : refreshMyPosts()])
}

// Entregables y siguiente paso
const collabPosts = computed(() => posts.value.filter((p) => p.collaborationId === props.id).sort((a, b) => a.dueInDays - b.dueInDays))
const deliverables = computed(() => collabPosts.value.map((p) => ({ post: p, state: deliverableState(p, events.value) })))
const stateLabel: Record<DeliverableState, string> = {
  pending: 'En preparación',
  in_review: 'En revisión',
  changes: 'Cambios pedidos',
  approved: 'Aprobada'
}
const collabDeliverables = computed(() => deliverablesByCollab.value[props.id] ?? [])
const enforceableOpen = computed(() => collabDeliverables.value.filter((d) => d.enforceable && !d.resolved).length)
// «Marcar como completada» solo se ofrece cuando se puede de verdad: sin entregables exigibles por resolver y con
// trabajo hecho dentro de CIBERAN (alguna publicación vinculada o algún entregable resuelto). Antes salía siempre,
// incluso recién aceptada la colaboración y sin ninguna publicación. La regla de negocio del servidor no cambia.
const isLive = computed(() => view.value?.status === 'accepted' || view.value?.status === 'in_progress')
const hasWork = computed(() => collabPosts.value.length > 0 || collabDeliverables.value.some((d) => d.resolved))
const canComplete = computed(() => isLive.value && enforceableOpen.value === 0 && hasWork.value)
// Publicaciones que se pueden asignar a un hueco (creador) o previsualizar: las de esta colaboración y, para asignar, las libres.
const deliverablePosts = computed(() => posts.value.filter((p) => !p.collaborationId || p.collaborationId === props.id))
const work = computed(() => {
  if (!view.value) return { tasks: [] as WorkTask[], waiting: null }
  return collaborationWork(props.role, view.value as WorkCollab, posts.value, events.value, myProfileId.value, collabDeliverables.value)
})
const closedText = computed(() => {
  const s = view.value?.status
  if (s === 'declined') return 'Solicitud rechazada: no hay nada más que hacer'
  if (s === 'cancelled') return 'Colaboración cancelada de común acuerdo'
  if (s === 'terminated') return 'Colaboración terminada por incumplimiento'
  if (s === 'completed') return hasRated(events.value, myProfileId.value) ? 'Colaboración completada y valorada' : 'Colaboración completada'
  return 'No tienes nada pendiente aquí'
})

const expandedPostId = ref<string | null>(typeof route.query.post === 'string' ? route.query.post : null)
const expandedPost = computed(() => (collabDeliverables.value.length ? deliverablePosts.value : collabPosts.value).find((p) => p.id === expandedPostId.value) ?? null)
const expandedChecklist = computed(() => (expandedPostId.value ? itemsByPost.value[expandedPostId.value] ?? [] : []))
watch(expandedPostId, (pid) => { if (pid) ensureItems(pid) }, { immediate: true })
function togglePost(pid: string) { expandedPostId.value = expandedPostId.value === pid ? null : pid }

// ---- Secciones (pestañas) ----
// La página era una sola columna muy larga, sobre todo en móvil. Cada bloque sigue montado (v-show),
// así que los enlaces con ancla (#respuesta, #entregables, #brief…) abren su pestaña y bajan hasta él.
type Section = 'resumen' | 'entregables' | 'acuerdo' | 'chat' | 'actividad'
const SECTIONS: { value: Section; label: string }[] = [
  { value: 'resumen', label: 'Resumen' }, { value: 'entregables', label: 'Entregables' }, { value: 'acuerdo', label: 'Acuerdo y archivos' },
  { value: 'chat', label: 'Chat' }, { value: 'actividad', label: 'Actividad' }
]
const SECTION_OF_HASH: Record<string, Section> = { '#respuesta': 'resumen', '#entregables': 'entregables', '#brief': 'acuerdo', '#archivos': 'acuerdo', '#chat': 'chat', '#cronologia': 'actividad' }
const initialSection = (): Section => SECTION_OF_HASH[route.hash]
  ?? SECTIONS.find((s) => s.value === route.query.seccion)?.value
  ?? (typeof route.query.post === 'string' ? 'entregables' : 'resumen')
const section = ref<Section>(initialSection())
const sections = computed(() => (view.value?.status === 'declined' ? SECTIONS.filter((s) => s.value !== 'chat') : SECTIONS))
function setSection(v: string) {
  section.value = v as Section
  router.replace({ query: { ...route.query, seccion: v }, hash: '' })
}

function scrollToHash(hash: string) {
  const target = SECTION_OF_HASH[hash]
  if (target) section.value = target
  nextTick(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
onMounted(() => { if (route.hash) scrollToHash(route.hash) })

function goTask(task: WorkTask) {
  const here = `/${props.role}/collaborations/${props.id}`
  if (task.to.startsWith(here)) {
    if (task.postId) expandedPostId.value = task.postId
    const hash = task.to.includes('#') ? `#${task.to.split('#')[1]}` : '#respuesta'
    scrollToHash(hash)
  } else {
    router.push(task.to)
  }
}

// Acciones (mismas que tenía la hoja)
const actionError = ref('')
const acting = computed(() => (isPartner ? partnerSide.acting.value : creatorSide.acting.value))
const payableStatuses = ['accepted', 'in_progress', 'completed']
const lastPayAttempt = ref(false)

async function handleAccept(amount: number | null) {
  actionError.value = ''
  try {
    await (isPartner ? partnerSide.accept(props.id, amount) : creatorSide.accept(props.id, amount))
    await reloadEvents()
    toast.success(`Colaboración aceptada${amount ? ` por ${formatMoney(amount)}` : ''}. Ya podéis empezar.`)
  } catch (e) {
    actionError.value = errorMessage(e, 'No se ha podido aceptar la solicitud. Inténtalo de nuevo.')
  }
}
async function onCountered() {
  await reloadEvents()
  toast.success('Contraoferta enviada: te avisaremos cuando responda.')
}
async function handleDecline() {
  actionError.value = ''
  try {
    await (isPartner ? partnerSide.decline(props.id) : creatorSide.decline(props.id))
    await router.push(`/${props.role}/requests`)
    toast.success('Solicitud rechazada')
  } catch (e) {
    actionError.value = errorMessage(e, 'No se ha podido rechazar la solicitud. Inténtalo de nuevo.')
  }
}
async function handleWithdraw() {
  const ok = await confirm({
    title: '¿Retirar la solicitud?',
    message: `${view.value?.counterpartName ?? 'La otra parte'} dejará de verla y se le avisará de que la has retirado. Podrás enviarle otra más adelante.`,
    confirmLabel: 'Sí, retirarla'
  })
  if (!ok) return
  actionError.value = ''
  try {
    await (isPartner ? partnerSide.withdraw(props.id) : creatorSide.withdraw(props.id))
    toast.success('Solicitud retirada')
    await router.push(`/${props.role}/requests`)
  } catch (e) {
    actionError.value = errorMessage(e, 'No se ha podido retirar la solicitud. Inténtalo de nuevo.')
  }
}
async function handleMarkCompleted() {
  const ok = await confirm({
    title: '¿Marcar como completada?',
    message: 'Indica que el trabajo de esta colaboración ya se ha entregado. No afecta al pago.',
    confirmLabel: 'Marcar como completada'
  })
  if (!ok) return
  actionError.value = ''
  try {
    await (isPartner ? partnerSide.markCompleted(props.id) : creatorSide.markCompleted(props.id))
    await reloadAll()
  } catch (e) {
    actionError.value = errorMessage(e, 'No se ha podido marcar como completada. Inténtalo de nuevo.')
  }
}
async function confirmPay() {
  const ok = await confirm({ title: '¿Confirmar el pago?', message: 'Se abrirá Stripe para completar el cobro de esta colaboración.', confirmLabel: 'Ir a pagar' })
  if (!ok) return
  lastPayAttempt.value = true
  await partnerSide.payForCollaboration(props.id)
}

// Tras proponer, aceptar o retirar una cancelación cambian el estado y la cronología.
async function afterCancelChange() {
  await Promise.all([isPartner ? partnerSide.refresh() : creatorSide.refresh(), loadEvents(props.id, true)])
}

// Resumen del acuerdo (imprimible / PDF) y fechas de entrega para el calendario.
const { ensureCreator } = useMyCreator()
const { ensurePartner } = useMyPartner()
const toast = useToast()
const printing = ref(false)
const isOpen = computed(() => !!view.value && ['requested', 'accepted', 'in_progress'].includes(view.value.status))
async function printAgreement() {
  const v = view.value
  if (!v || printing.value) return
  printing.value = true
  try {
    const myName = (isPartner ? (await ensurePartner())?.name : (await ensureCreator())?.displayName) ?? 'Mi cuenta'
    const data: AgreementData = {
      id: v.id, title: title.value,
      creatorName: isPartner ? v.counterpartName : myName, partnerName: isPartner ? myName : v.counterpartName,
      status: collaborationStatusMeta[v.status].label, brief: v.brief, budgetCents: v.budgetCents,
      acceptedOn: acceptedOn.value, finalDue: finalDue.value, paidAt: v.paidAt,
      deliverables: collabDeliverables.value.length ? collabDeliverables.value.map((d) => d.title) : (v.packageDeliverables ?? []),
      scopeNotes: v.scopeNotes, revisionsIncluded: v.revisionsIncluded, exclusivity: v.exclusivity, usageRights: v.usageRights,
      campaignGoal: v.campaignGoal, targetAudience: v.targetAudience, tone: v.tone
    }
    printHtml(buildAgreementHtml(data, await agreementFingerprint(data)))
  } catch {
    toast.error('No se ha podido preparar el resumen del acuerdo.')
  } finally {
    printing.value = false
  }
}
const datedPosts = computed(() => collabPosts.value.filter((p) => !!p.dueDate))
function exportDates() {
  const v = view.value
  if (!v || !datedPosts.value.length) return
  const link = `${window.location.origin}/${props.role}/collaborations/${v.id}`
  const ics = buildIcs(datedPosts.value.map((p) => ({ uid: `post-${p.id}`, date: p.dueDate.slice(0, 10), title: `Entrega: ${p.title} (${v.counterpartName})`, description: `Colaboración «${title.value}» en CIBERAN`, url: link })), `CIBERAN · ${title.value}`)
  downloadIcs(`ciberan-entregas-${v.id.slice(0, 8)}.ics`, ics)
  toast.success('Calendario descargado: ábrelo para añadir las fechas')
}

useHead({ title: computed(() => title.value || 'Colaboración') })
</script>

<template>
  <div class="cwork">
    <EmptyState
      v-if="notFound || !view"
      icon="ph:handshake" title="No encontramos esta colaboración"
      description="Puede que el enlace sea antiguo o que no pertenezca a tu cuenta."
    >
      <BaseButton :to="`/${role}/requests`" variant="primary" size="sm">Ver mis colaboraciones</BaseButton>
    </EmptyState>

    <template v-else>
      <BaseCard v-if="route.query.payment" padding="md" class="pay-notice">
        <Icon :name="route.query.payment === 'success' ? 'ph:check-circle-fill' : 'ph:info-fill'" class="size-5 shrink-0" />
        <p class="text-sm">{{ route.query.payment === 'success' ? 'Pago enviado.' : 'Pago cancelado, no se ha cobrado nada.' }}</p>
      </BaseCard>

      <CollabHeader
        :role="role" :counterpart="view.counterpartName" :title="title" :brief="briefExcerpt" :status="view.status" :phase-label="phaseLabel"
        :meta="finalDue ? `Entrega final ${new Date(`${finalDue}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')}` : undefined"
      >
        <CollaborationChatButton :counterpart-profile-id="view.counterpartProfileId" :counterpart-name="view.counterpartName" />
      </CollabHeader>

      <CollabStepper v-if="phase" :phase="phase" :pay-label="payLabel === 'Pago' ? 'Pagada' : 'Cobrada'" />

      <p v-if="expiry.label" class="cwork__expiry" :data-expired="expiry.expired" role="status">
        <Icon :name="expiry.expired ? 'ph:clock-countdown-fill' : 'ph:clock'" class="size-4" />
        {{ expiry.expired ? (view.initiatedBy === role ? 'Esta propuesta ha caducado: ya no se puede aceptar. Puedes retirarla y enviar una nueva.' : 'Esta propuesta ha caducado: ya no se puede aceptar. Puedes rechazarla o pedir que te la envíen de nuevo.') : `${expiry.label}: pasado ese plazo ya no se podrá aceptar.` }}
      </p>

      <CollabNextStep
        :tasks="work.tasks" :waiting="work.waiting" :closed-text="closedText"
        :inline-kinds="section === 'resumen' ? ['respond_request', 'respond_cancel', 'close_collaboration'] : []" @go="goTask"
      />

      <SegmentedTabs :model-value="section" :options="sections" label="Secciones de la colaboración" class="cwork__tabs" data-collab-sections @update:model-value="setSection" />

      <div class="cwork__grid" :data-section="section">
        <div class="cwork__main">
          <!-- Presupuesto y respuesta: el panel de negociación sigue siendo el único sitio con el precio acordado. -->
          <PanelCard v-show="section === 'resumen'" id="respuesta" title="Presupuesto y respuesta" class="cwork__anchor">
            <div class="collab-actions">
              <NegotiationPanel
                :collaboration-id="view.id" :initial-budget-cents="view.budgetCents" :status="view.status"
                :my-role="role" :initiated-by="view.initiatedBy" :expired="expiry.expired"
                @accept="handleAccept" @decline="handleDecline" @countered="onCountered"
              />
              <BaseButton
                v-if="view.status === 'requested' && view.initiatedBy === role"
                variant="outline" block icon="ph:arrow-u-up-left-bold" :loading="acting === view.id" data-withdraw-request @click="handleWithdraw"
              >
                Retirar mi solicitud
              </BaseButton>

              <template v-if="isPartner">
                <p v-if="view.paidAt" class="collab-paid"><Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(view.paidAt) }}</p>
                <p v-else-if="!paymentsEnabled && payableStatuses.includes(view.status) && view.budgetCents" class="collab-freepay" data-free-launch-pay>
                  <Icon name="ph:info" class="size-4" /> En esta etapa CIBERAN no gestiona pagos ni cobra comisión: el importe acordado lo pagas a {{ view.counterpartName }} por el medio que acordéis.
                </p>
                <BaseButton
                  v-else-if="paymentsEnabled && payableStatuses.includes(view.status)"
                  variant="brand" block :disabled="!view.budgetCents" :loading="partnerSide.paying.value === view.id"
                  @click="confirmPay"
                >
                  {{ partnerSide.paying.value === view.id ? 'Abriendo pago…' : 'Pagar' }}
                </BaseButton>
                <p v-if="partnerSide.payError.value && lastPayAttempt" class="collab-error" role="alert">{{ partnerSide.payError.value }}</p>
              </template>
              <p v-else-if="view.paidAt" class="collab-paid"><Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(view.paidAt) }}</p>
              <p v-else-if="!paymentsEnabled && payableStatuses.includes(view.status) && view.budgetCents" class="collab-freepay" data-free-launch-pay>
                <Icon name="ph:info" class="size-4" /> En esta etapa CIBERAN no gestiona pagos ni cobra comisión: el importe acordado te lo paga {{ view.counterpartName }} por el medio que acordéis.
              </p>

              <BaseButton
                v-if="canComplete"
                variant="primary" block :loading="acting === view.id" data-mark-completed @click="handleMarkCompleted"
              >
                Marcar como completada
              </BaseButton>
              <p v-else-if="isLive && enforceableOpen" class="cwork__close-note" data-close-note>
                {{ enforceableOpen }} entregable{{ enforceableOpen === 1 ? '' : 's' }} sin resolver: {{ isPartner ? 'resuélvelos (aprobar, aceptar sin aprobación o renunciar, con motivo) antes de completar.' : `tienen que estar aprobados o resueltos por ${view.counterpartName} antes de completar.` }}
              </p>
              <p v-else-if="isLive" class="cwork__close-note" data-close-note>
                Podrás marcarla como completada cuando haya al menos una publicación vinculada y el trabajo esté entregado.
              </p>
              <RatingPrompt
                v-else-if="view.status === 'completed'"
                :collaboration-id="view.id" :counterpart-name="view.counterpartName" @rated="reloadEvents"
              />
              <p v-if="actionError" class="collab-error" role="alert">{{ actionError }}</p>
              <div id="cancelar">
                <CollabCancelPanel
                  :collaboration-id="view.id" :status="view.status" :paid-at="view.paidAt"
                  :my-profile-id="myProfileId" :counterpart-name="view.counterpartName" @changed="afterCancelChange"
                />
              </div>
            </div>
          </PanelCard>

          <PanelCard v-show="section === 'entregables'" id="entregables" title="Entregables" :description="collabDeliverables.length ? 'Lo contratado, con su publicación y su estado.' : 'Las publicaciones vinculadas a esta colaboración.'" class="cwork__anchor">
            <DeliverableList
              v-if="collabDeliverables.length"
              :role="role" :collaboration-id="view.id" :counterpart-name="view.counterpartName" :deliverables="collabDeliverables"
              :posts="deliverablePosts" :active="view.status === 'accepted' || view.status === 'in_progress'" :my-profile-id="myProfileId"
              :expanded-post-id="expandedPostId" :checklist="expandedChecklist" @toggle-post="togglePost" @changed="reloadAll"
            />
            <template v-else>
              <EmptyState
                v-if="!deliverables.length"
                icon="ph:image-square"
                title="Todavía no hay publicaciones"
                :description="isPartner ? `Cuando ${view.counterpartName} cree y vincule una publicación, aparecerá aquí para que la revises.` : 'Crea una publicación vinculada a esta colaboración para que la otra parte pueda revisarla.'"
              >
                <!-- Una sola vía: «Siguiente paso» (arriba) ya lleva a crear la publicación con esta colaboración elegida;
                     solo se repite aquí si el siguiente paso es otro (p. ej. hay una solicitud pendiente de responder). -->
                <BaseButton
                  v-if="!isPartner && (view.status === 'accepted' || view.status === 'in_progress') && work.tasks[0]?.kind !== 'start_deliverable'"
                  :to="`/creator/timeline?nueva=1&colaboracion=${view.id}`" variant="primary" size="sm"
                >Crear publicación</BaseButton>
              </EmptyState>
              <ul v-else class="deliv">
                <li v-for="{ post, state } in deliverables" :key="post.id" class="deliv__item">
                  <button type="button" class="deliv__row" :aria-expanded="expandedPostId === post.id" @click="togglePost(post.id)">
                    <span class="deliv__main">
                      <span class="deliv__title">{{ post.title }}</span>
                      <span class="deliv__meta">
                        <PhaseChip :status="post.status" compact />
                        <span class="deliv__state" :data-state="state">{{ stateLabel[state] }}</span>
                        <span v-if="post.contentVersion" class="deliv__version">v{{ post.contentVersion }}</span>
                        <span v-if="post.status !== 'published' && post.status !== 'scheduled'" class="deliv__due" :data-late="post.dueInDays < 0">
                          {{ post.dueInDays < 0 ? `Atrasada ${Math.abs(post.dueInDays)} d` : post.dueInDays === 0 ? 'Vence hoy' : `En ${post.dueInDays} d` }}
                        </span>
                      </span>
                    </span>
                    <Icon name="ph:caret-down-bold" class="deliv__caret size-4" />
                  </button>
                  <CollabPostPreview v-if="expandedPost?.id === post.id" :post="expandedPost" :checklist="expandedChecklist">
                    <PostReviewActions
                      v-if="isPartner && expandedPost.status === 'ready_for_review'" class="post-preview__actions"
                      :post-id="expandedPost.id" :content-version="expandedPost.contentVersion" @done="() => { expandedPostId = null; reloadAll() }"
                    />
                    <NuxtLink v-if="!isPartner" :to="`/creator/post/${expandedPost.id}`" class="link-arrow">
                      Abrir publicación <Icon name="ph:arrow-right-bold" class="size-4" />
                    </NuxtLink>
                  </CollabPostPreview>
                </li>
              </ul>
              <!-- Modo libre: sin entregables definidos. La marca puede definirlos una vez (el creador confirma). -->
              <DeliverableDefineForm v-if="isPartner && (view.status === 'accepted' || view.status === 'in_progress')" :collaboration-id="view.id" class="cwork__define" @changed="reloadAll" />
            </template>
          </PanelCard>

          <PanelCard v-show="section === 'acuerdo'" id="brief" title="Acuerdo" description="Brief y condiciones pactadas." class="cwork__anchor">
            <p class="collab-brief">{{ view.brief }}</p>
            <CollaborationTermsCard
              :terms="view" :collaboration-id="view.id" :status="view.status"
              :package-info="{ title: view.packageTitle, description: view.packageDescription, deliverables: view.packageDeliverables }"
              :can-complete-brief="isPartner && (view.status === 'accepted' || view.status === 'in_progress')"
            />
            <DataList :items="[{ label: 'Pedida', value: relativeTime(view.createdAt) }, ...(view.budgetCents ? [{ label: 'Presupuesto', value: formatEuros(view.budgetCents) }] : [])]" />
            <div v-if="view.status !== 'requested' && view.status !== 'declined'" class="cwork__agreement-actions">
              <BaseButton variant="outline" size="sm" icon="ph:printer-bold" :loading="printing" data-print-agreement @click="printAgreement">Resumen del acuerdo (imprimir o PDF)</BaseButton>
              <BaseButton v-if="datedPosts.length" variant="outline" size="sm" icon="ph:calendar-plus-bold" data-export-ics @click="exportDates">Añadir entregas al calendario</BaseButton>
            </div>
          </PanelCard>

          <PanelCard v-if="view.status !== 'declined'" v-show="section === 'acuerdo'" id="archivos" title="Archivos" description="Material compartido entre las dos partes. Solo lo veis vosotros." class="cwork__anchor">
            <CollabFiles :collaboration-id="view.id" :open="isOpen" :my-profile-id="myProfileId" :counterpart-name="view.counterpartName" @changed="reloadEvents" />
          </PanelCard>
        </div>

        <aside class="cwork__side">
          <CollabSummary
            v-if="phase" v-show="section === 'resumen'" :budget-cents="view.budgetCents" :deliverables="deliverablesText" :usage="view.usageRights"
            :accepted-on="acceptedOn" :final-due="finalDue" :payment="payment" :pay-label="payLabel"
          />
          <PanelCard v-if="view.status !== 'declined'" v-show="section === 'chat'" id="chat" :title="`Chat con ${view.counterpartName}`" description="La misma conversación que tenéis en Mensajes." class="cwork__anchor">
            <CollabChatPanel :counterpart-profile-id="view.counterpartProfileId" :counterpart-name="view.counterpartName" :role="role" />
          </PanelCard>
          <PanelCard v-show="section === 'actividad'" id="cronologia" title="Cronología" class="cwork__anchor" description="Lo que ha ocurrido, de lo más reciente a lo más antiguo.">
            <CollabNoteForm v-if="view.status !== 'declined'" :collaboration-id="view.id" class="cwork__note" @added="reloadEvents" />
            <CollabTimeline
              :events="events" :error="eventsError"
              :my-profile-id="myProfileId" :counterpart-profile-id="view.counterpartProfileId" :counterpart-name="view.counterpartName"
            />
          </PanelCard>
        </aside>
      </div>
    </template>
  </div>
</template>

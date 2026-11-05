<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { errorMessage } from '~/utils/error-message'
import { relativeTime } from '~/utils/status'
import { collaborationWork, deliverableState, hasRated, type DeliverableState, type WorkCollab, type WorkTask } from '~/utils/collaboration-work'
import type { CollaborationTerms } from '~/utils/collaboration-terms'
import type { CollaborationStatus } from '~/types'
import { expiryState } from '~/utils/collab-expiry'

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
const { posts: partnerPosts, ensureLoaded: ensurePartnerPosts, refresh: refreshPartnerPosts } = usePartnerPosts()
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
// Publicaciones que se pueden asignar a un hueco (creador) o previsualizar: las de esta colaboración y, para asignar, las libres.
const deliverablePosts = computed(() => posts.value.filter((p) => !p.collaborationId || p.collaborationId === props.id))
const work = computed(() => {
  if (!view.value) return { tasks: [] as WorkTask[], waiting: null }
  return collaborationWork(props.role, view.value as WorkCollab, posts.value, events.value, myProfileId.value, collabDeliverables.value)
})
const closedText = computed(() => {
  const s = view.value?.status
  if (s === 'declined') return 'Solicitud rechazada: no hay nada más que hacer'
  if (s === 'completed') return hasRated(events.value, myProfileId.value) ? 'Colaboración completada y valorada' : 'Colaboración completada'
  return 'No tienes nada pendiente aquí'
})

const expandedPostId = ref<string | null>(typeof route.query.post === 'string' ? route.query.post : null)
const expandedPost = computed(() => (collabDeliverables.value.length ? deliverablePosts.value : collabPosts.value).find((p) => p.id === expandedPostId.value) ?? null)
const expandedChecklist = computed(() => (expandedPostId.value ? itemsByPost.value[expandedPostId.value] ?? [] : []))
watch(expandedPostId, (pid) => { if (pid) ensureItems(pid) }, { immediate: true })
function togglePost(pid: string) { expandedPostId.value = expandedPostId.value === pid ? null : pid }

function scrollToHash(hash: string) {
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
  } catch (e) {
    actionError.value = errorMessage(e, 'No se ha podido aceptar la solicitud. Inténtalo de nuevo.')
  }
}
async function handleDecline() {
  actionError.value = ''
  try {
    await (isPartner ? partnerSide.decline(props.id) : creatorSide.decline(props.id))
    await router.push(`/${props.role}/requests`)
  } catch (e) {
    actionError.value = errorMessage(e, 'No se ha podido rechazar la solicitud. Inténtalo de nuevo.')
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

useHead({ title: computed(() => (view.value ? `Colaboración con ${view.value.counterpartName}` : 'Colaboración')) })
</script>

<template>
  <div class="cwork">
    <NuxtLink :to="`/${role}/requests`" class="cwork__back"><Icon name="ph:arrow-left-bold" class="size-4" /> Colaboraciones</NuxtLink>

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

      <CollabParty :name="view.counterpartName" :status="view.status" :brief="view.brief" class="cwork__party">
        <CollaborationChatButton :counterpart-profile-id="view.counterpartProfileId" :counterpart-name="view.counterpartName" />
      </CollabParty>

      <p v-if="expiry.label" class="cwork__expiry" :data-expired="expiry.expired" role="status">
        <Icon :name="expiry.expired ? 'ph:clock-countdown-fill' : 'ph:clock'" class="size-4" />
        {{ expiry.expired ? 'Esta propuesta ha caducado: ya no se puede aceptar. Puedes rechazarla o pedir que te la envíen de nuevo.' : `${expiry.label}: pasado ese plazo ya no se podrá aceptar.` }}
      </p>

      <CollabNextStep :tasks="work.tasks" :waiting="work.waiting" :closed-text="closedText" @go="goTask" />

      <div class="cwork__grid">
        <div class="cwork__main">
          <!-- Presupuesto y respuesta: el panel de negociación sigue siendo el único sitio con el precio acordado. -->
          <PanelCard id="respuesta" title="Presupuesto y respuesta" class="cwork__anchor">
            <div class="collab-actions">
              <NegotiationPanel
                :collaboration-id="view.id" :initial-budget-cents="view.budgetCents" :status="view.status"
                :my-role="role" :initiated-by="view.initiatedBy"
                @accept="handleAccept" @decline="handleDecline"
              />

              <template v-if="isPartner">
                <p v-if="view.paidAt" class="collab-paid"><Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(view.paidAt) }}</p>
                <BaseButton
                  v-else-if="payableStatuses.includes(view.status)"
                  variant="brand" block :disabled="!view.budgetCents" :loading="partnerSide.paying.value === view.id"
                  @click="confirmPay"
                >
                  {{ partnerSide.paying.value === view.id ? 'Abriendo pago…' : 'Pagar' }}
                </BaseButton>
                <p v-if="partnerSide.payError.value && lastPayAttempt" class="collab-error" role="alert">{{ partnerSide.payError.value }}</p>
              </template>
              <p v-else-if="view.paidAt" class="collab-paid"><Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(view.paidAt) }}</p>

              <BaseButton
                v-if="view.status === 'accepted' || view.status === 'in_progress'"
                variant="secondary" block :loading="acting === view.id" data-mark-completed @click="handleMarkCompleted"
              >
                Marcar como completada
              </BaseButton>
              <p v-if="(view.status === 'accepted' || view.status === 'in_progress') && enforceableOpen" class="cwork__close-note" data-close-note>
                {{ enforceableOpen }} entregable{{ enforceableOpen === 1 ? '' : 's' }} sin resolver: {{ isPartner ? 'resuélvelos (aprobar, aceptar sin aprobación o renunciar, con motivo) antes de completar.' : `tienen que estar aprobados o resueltos por ${view.counterpartName} antes de completar.` }}
              </p>
              <RatingPrompt
                v-else-if="view.status === 'completed'"
                :collaboration-id="view.id" :counterpart-name="view.counterpartName" @rated="reloadEvents"
              />
              <p v-if="actionError" class="collab-error" role="alert">{{ actionError }}</p>
            </div>
          </PanelCard>

          <PanelCard id="entregables" title="Entregables" :description="collabDeliverables.length ? 'Lo contratado, con su publicación y su estado.' : 'Las publicaciones vinculadas a esta colaboración.'" class="cwork__anchor">
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
                :description="isPartner ? `Cuando ${view.counterpartName} cree y vincule una publicación, aparecerá aquí para que la revises.` : 'Crea una publicación en Studio y vincúlala a esta colaboración para que la otra parte pueda revisarla.'"
              >
                <BaseButton v-if="!isPartner && (view.status === 'accepted' || view.status === 'in_progress')" to="/creator/timeline" variant="primary" size="sm">Abrir Studio</BaseButton>
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

          <PanelCard id="brief" title="Acuerdo" description="Brief y condiciones pactadas." class="cwork__anchor">
            <p class="collab-brief">{{ view.brief }}</p>
            <CollaborationTermsCard
              :terms="view" :collaboration-id="view.id" :status="view.status"
              :package-info="{ title: view.packageTitle, description: view.packageDescription, deliverables: view.packageDeliverables }"
              :can-complete-brief="isPartner && (view.status === 'accepted' || view.status === 'in_progress')"
            />
            <DataList :items="[{ label: 'Pedida', value: relativeTime(view.createdAt) }, ...(view.budgetCents ? [{ label: 'Presupuesto', value: formatEuros(view.budgetCents) }] : [])]" />
          </PanelCard>

          <PanelCard v-if="isPartner && view.status !== 'requested' && view.status !== 'declined'" title="Rendimiento" description="Cómo van las publicaciones de esta colaboración.">
            <CollaborationReport :collaboration-id="view.id" />
          </PanelCard>
        </div>

        <aside class="cwork__side">
          <PanelCard title="Cronología" description="Lo que ha ocurrido, de lo más reciente a lo más antiguo.">
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

<script setup lang="ts">
import { relativeTime } from '~/utils/status'
import type { MyCollaboration } from '~/composables/useMyCollaborations'

useHead({ title: 'Colaboraciones' })

// Pagar/completar/valorar viven aquí (Nivel 1, siempre visibles) desde la
// Fase 2 — mismo composable que antes solo usaba partner/profile.vue
// (`payForCollaboration`, `markCompleted`, `paying`, `payError`), nada de
// lógica de negocio nueva. Desde la Fase 3, la pestaña "Colaboraciones" de
// Ajustes ya no existe — este es el único sitio.
const { collaborations, paying, acting, payError, pendingCount, ensureLoaded, refresh: refreshCollaborations, accept, decline, payForCollaboration, markCompleted } = useMyCollaborations()
const { confirm } = useConfirm()
const route = useRoute()
const { posts: partnerPosts, ensureLoaded: ensurePostsLoaded } = usePartnerPosts()
// Si se vuelve de Stripe (`?payment=`), se fuerza un refresco real en vez
// de fiarse de la caché — el webhook puede haber escrito `paid_at` hace
// solo un instante.
await Promise.all([route.query.payment ? refreshCollaborations() : ensureLoaded(), ensurePostsLoaded()])

const payableStatuses = ['accepted', 'in_progress', 'completed']
const lastPayAttemptId = ref('')
async function confirmPay(collaborationId: string) {
  const ok = await confirm({ title: '¿Confirmar el pago?', message: 'Se abrirá Stripe para completar el cobro de esta colaboración.', confirmLabel: 'Ir a pagar' })
  if (!ok) return
  lastPayAttemptId.value = collaborationId
  await payForCollaboration(collaborationId)
}
async function confirmMarkCompleted(collaborationId: string) {
  const ok = await confirm({
    title: '¿Marcar como completada?',
    message: 'Indica que el trabajo de esta colaboración ya se ha entregado. No afecta al pago.',
    confirmLabel: 'Marcar como completada'
  })
  if (ok) await markCompleted(collaborationId)
}

// Tres grupos: lo que espera respuesta, lo que está en marcha (aceptadas y en curso) y lo ya cerrado.
// Antes las aceptadas caían en «Historial» y «Ver colaboración» desde el chat dejaba en una lista vacía.
type RequestsTab = 'pending' | 'active' | 'history'
const ACTIVE_STATUSES = ['accepted', 'in_progress']
const tab = ref<RequestsTab>('pending')
const tabs = computed(() => [
  { value: 'pending', label: pendingCount.value ? `Pendientes (${pendingCount.value})` : 'Pendientes' },
  { value: 'active', label: 'En curso' },
  { value: 'history', label: 'Historial' }
])

const newestFirst = (list: typeof collaborations.value) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

const pending = computed(() => newestFirst(collaborations.value.filter((c) => c.status === 'requested')))
const active = computed(() => newestFirst(collaborations.value.filter((c) => ACTIVE_STATUSES.includes(c.status))))
const history = computed(() => newestFirst(collaborations.value.filter((c) => c.status !== 'requested' && !ACTIVE_STATUSES.includes(c.status))))
const visible = computed(() => (tab.value === 'pending' ? pending.value : tab.value === 'active' ? active.value : history.value))

// Pestaña inicial: la de la URL (`?tab=`, p. ej. «Ver colaboración» desde el chat); si no, la que tenga contenido.
const queryTab = route.query.tab
tab.value = queryTab === 'active' || queryTab === 'history' || queryTab === 'pending'
  ? queryTab
  : (pending.value.length || !active.value.length ? 'pending' : 'active')

const detailOpen = ref(false)
const detailCollab = ref<MyCollaboration | null>(null)
const actionError = ref('')

// Fase 2: Nivel 1 (quién/estado/brief corto/acción del momento) fijo;
// Brief, Calendario y Registro pasan a pestañas.
const detailTab = ref<'brief' | 'calendar' | 'report' | 'log'>('brief')
const detailTabs = [
  { value: 'brief', label: 'Brief' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'report', label: 'Rendimiento' },
  { value: 'log', label: 'Registro' }
]
const expandedPostId = ref<string | null>(null)

// El detalle abierto es una copia: se mantiene al día cuando la lista se recarga
// (p. ej. tras completar el brief), sin que cada acción tenga que volver a buscarla.
watch(collaborations, (list) => {
  if (!detailCollab.value) return
  const fresh = list.find((c) => c.id === detailCollab.value!.id)
  if (fresh) detailCollab.value = fresh
})

function openDetail(collab: MyCollaboration) {
  detailCollab.value = collab
  actionError.value = ''
  detailTab.value = 'brief'
  expandedPostId.value = null
  detailOpen.value = true
}

const collaborationPosts = computed(() => partnerPosts.value.filter((p) => p.collaborationId === detailCollab.value?.id))
const expandedPost = computed(() => collaborationPosts.value.find((p) => p.id === expandedPostId.value) ?? null)

// Enlace directo `?collaboration=<id>`: al volver de Stripe (éxito o
// cancelación) reabre la colaboración que se estaba pagando, y desde los
// avisos o el chat abre la colaboración concreta en su grupo de la lista. Con
// `&post=<id>` (aviso «Entrega para revisar») abre además la pestaña
// Calendario con esa entrega desplegada y sus botones de revisión.
function openFromQuery() {
  const id = route.query.collaboration
  const match = typeof id === 'string' ? collaborations.value.find((c) => c.id === id) : undefined
  if (!match) return
  tab.value = match.status === 'requested' ? 'pending' : ACTIVE_STATUSES.includes(match.status) ? 'active' : 'history'
  openDetail(match)
  const postId = route.query.post
  if (typeof postId === 'string' && collaborationPosts.value.some((p) => p.id === postId)) {
    detailTab.value = 'calendar'
    expandedPostId.value = postId
  }
}
openFromQuery()
watch(() => [route.query.collaboration, route.query.post], openFromQuery)

function toggleExpandedPost(post: { id: string }) {
  expandedPostId.value = expandedPostId.value === post.id ? null : post.id
}

// Solo lectura: consultar el checklist de un entregable sin salir de la
// colaboración (auditoría de usabilidad, pestaña Calendario) — marcar
// items sigue siendo tarea exclusiva del creador, como hoy.
const { itemsByPost, ensureItems } = useChecklist()
const expandedPostChecklist = computed(() => (expandedPostId.value ? itemsByPost.value[expandedPostId.value] ?? [] : []))
watch(expandedPostId, (id) => { if (id) ensureItems(id) })

// Antes `accept`/`decline` se llamaban sin esperar su resultado y la hoja
// se cerraba al instante — si el update a Supabase fallaba, parecía que
// había funcionado sin haber cambiado nada de verdad.
// Antes, tras aceptar, se cerraba la hoja y se redirigía a /partner/profile
// a pagar, porque ahí era el único sitio con un botón de pago real. Ahora
// el botón de pago vive aquí mismo (Nivel 1): la hoja se queda abierta y
// `detailCollab` se refresca con el estado ya aceptado.
async function handleAccept(amount: number | null) {
  if (!detailCollab.value) return
  actionError.value = ''
  try {
    await accept(detailCollab.value.id, amount)
    detailCollab.value = collaborations.value.find((c) => c.id === detailCollab.value!.id) ?? detailCollab.value
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'No se ha podido aceptar la solicitud. Inténtalo de nuevo.'
  }
}

async function handleDecline() {
  if (!detailCollab.value) return
  actionError.value = ''
  try {
    await decline(detailCollab.value.id)
    detailOpen.value = false
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'No se ha podido rechazar la solicitud. Inténtalo de nuevo.'
  }
}

async function handleMarkCompleted() {
  if (!detailCollab.value) return
  await confirmMarkCompleted(detailCollab.value.id)
  detailCollab.value = collaborations.value.find((c) => c.id === detailCollab.value!.id) ?? detailCollab.value
}
</script>

<template>
  <AppShell role="partner" title="Colaboraciones" subtitle="Tus colaboraciones con creadores de contenido">
    <BaseCard v-if="route.query.payment" padding="md" class="pay-notice">
      <Icon
        :name="route.query.payment === 'success' ? 'ph:check-circle-fill' : 'ph:info-fill'" class="size-5 shrink-0"
        :class="route.query.payment === 'success' ? 'text-[var(--color-phase-published)]' : 'text-[var(--text-muted)]'"
      />
      <p class="text-sm text-[var(--color-text)]">
        {{ route.query.payment === 'success' ? 'Pago enviado.' : 'Pago cancelado, no se ha cobrado nada.' }}
      </p>
    </BaseCard>

    <div class="collab-toolbar"><SegmentedTabs v-model="tab" :options="tabs" /></div>

    <EmptyState
      v-if="!visible.length && tab === 'pending'"
      icon="ph:handshake" title="Sin solicitudes pendientes"
      description="Contacta a un creador de contenido desde 'Descubrir', o espera a que te encuentren ellos."
    />
    <EmptyState
      v-else-if="!visible.length && tab === 'active'"
      icon="ph:handshake" title="Sin colaboraciones en curso"
      description="Las solicitudes y ofertas que se acepten aparecerán aquí hasta que se completen."
    />
    <EmptyState
      v-else-if="!visible.length"
      icon="ph:clock-counter-clockwise" title="Todavía no hay historial"
      description="Las colaboraciones completadas y las solicitudes rechazadas se guardan aquí."
    />

    <div v-else class="collab-grid">
      <CollabCard
        v-for="collab in visible" :key="collab.id"
        :name="collab.creatorName ?? 'Sin asignar'" :status="collab.status" :brief="collab.brief" :budget-cents="collab.budgetCents" :created-at="collab.createdAt"
        :hint="collab.status === 'requested' ? (collab.initiatedBy === 'creator' ? 'Te toca responder' : 'Esperando al creador') : undefined"
        @open="openDetail(collab)"
      />
    </div>

    <BottomSheet v-model="detailOpen" :title="detailCollab?.creatorName ?? 'Solicitud'">
      <template v-if="detailCollab">
        <CollabParty :name="detailCollab.creatorName ?? 'Sin asignar'" :status="detailCollab.status" :brief="detailCollab.brief">
          <CollaborationChatButton :counterpart-profile-id="detailCollab.creatorProfileId" :counterpart-name="detailCollab.creatorName ?? 'el creador'" />
        </CollabParty>

        <!-- Nivel 1: la acción del momento, siempre visible, nunca dentro de una pestaña. -->
        <div class="collab-actions">
          <NegotiationPanel
            :collaboration-id="detailCollab.id" :initial-budget-cents="detailCollab.budgetCents" :status="detailCollab.status"
            my-role="partner" :initiated-by="detailCollab.initiatedBy"
            @accept="handleAccept" @decline="handleDecline"
          />

          <p v-if="detailCollab.paidAt" class="collab-paid">
            <Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(detailCollab.paidAt) }}
          </p>
          <BaseButton
            v-else-if="payableStatuses.includes(detailCollab.status)"
            variant="brand" block :disabled="!detailCollab.budgetCents" :loading="paying === detailCollab.id"
            @click="confirmPay(detailCollab.id)"
          >
            {{ paying === detailCollab.id ? 'Abriendo pago…' : 'Pagar' }}
          </BaseButton>
          <p v-if="payError && lastPayAttemptId === detailCollab.id" class="collab-error" role="alert">{{ payError }}</p>

          <BaseButton
            v-if="detailCollab.status === 'accepted' || detailCollab.status === 'in_progress'"
            variant="secondary" block :loading="acting === detailCollab.id"
            @click="handleMarkCompleted"
          >
            Marcar como completada
          </BaseButton>
          <RatingPrompt
            v-else-if="detailCollab.status === 'completed'"
            :collaboration-id="detailCollab.id" :counterpart-name="detailCollab.creatorName ?? 'el creador'"
          />
          <p v-if="actionError" class="collab-error" role="alert">{{ actionError }}</p>
        </div>

        <!-- Nivel 2: consulta ocasional, bajo pestañas — ninguna tarea habitual exige cruzarlas. -->
        <SegmentedTabs v-model="detailTab" :options="detailTabs" class="mb-4" />

        <div v-show="detailTab === 'brief'">
          <p class="collab-brief">{{ detailCollab.brief }}</p>
          <CollaborationTermsCard :terms="detailCollab" :collaboration-id="detailCollab.id" :status="detailCollab.status"
            :package-info="{ title: detailCollab.packageTitle, description: detailCollab.packageDescription, deliverables: detailCollab.packageDeliverables }"
            :can-complete-brief="detailCollab.status === 'accepted' || detailCollab.status === 'in_progress'"
          />
          <DataList :items="[{ label: 'Pedida', value: relativeTime(detailCollab.createdAt) }]" />
        </div>

        <div v-show="detailTab === 'calendar'">
          <WeekBoard :posts="collaborationPosts" :has-any-posts="false" :two-column="false" @open="toggleExpandedPost" />
          <CollabPostPreview v-if="expandedPost" :post="expandedPost" :checklist="expandedPostChecklist">
            <!-- Antes esta pestaña era de solo lectura: ver la entrega "Para revisar" aquí no daba
                 ninguna forma de actuar. Mismo componente que usa Inicio. -->
            <PostReviewActions
              v-if="expandedPost.status === 'ready_for_review'" class="post-preview__actions"
              :post-id="expandedPost.id" @done="expandedPostId = null"
            />
          </CollabPostPreview>
        </div>

        <!-- A-R15: se monta al abrir la pestaña (y se vuelve a leer cada vez), con la RLS como única autorización. -->
        <CollaborationReport v-if="detailTab === 'report'" :key="detailCollab.id" :collaboration-id="detailCollab.id" />

        <div v-show="detailTab === 'log'">
          <CollaborationLogCard :collaboration-id="detailCollab.id" :counterpart-name="detailCollab.creatorName ?? 'el creador'" />
        </div>
      </template>
    </BottomSheet>
  </AppShell>
</template>

<script setup lang="ts">
import { relativeTime } from '~/utils/status'
import type { CollabRequest } from '~/composables/useCollabRequests'

useHead({ title: 'Colaboraciones' })

const { requests, pendingCount, acting, ensureLoaded, accept, decline, markCompleted } = useCollabRequests()
const { confirm } = useConfirm()
// Calendario (ver WeekBoard.vue) acotado a la colaboración abierta — en
// paralelo, no en serie, con las solicitudes.
const { posts: myPosts, ensureLoaded: ensurePostsLoaded } = useMyPosts()
await Promise.all([ensureLoaded(), ensurePostsLoaded()])

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

const newestFirst = (list: typeof requests.value) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

const pending = computed(() => newestFirst(requests.value.filter((r) => r.status === 'requested')))
const active = computed(() => newestFirst(requests.value.filter((r) => ACTIVE_STATUSES.includes(r.status))))
const history = computed(() => newestFirst(requests.value.filter((r) => r.status !== 'requested' && !ACTIVE_STATUSES.includes(r.status))))
const visible = computed(() => (tab.value === 'pending' ? pending.value : tab.value === 'active' ? active.value : history.value))

// Pestaña inicial: la de la URL (`?tab=`, p. ej. «Ver colaboración» desde el chat); si no, la que tenga contenido.
const route = useRoute()
const queryTab = route.query.tab
tab.value = queryTab === 'active' || queryTab === 'history' || queryTab === 'pending'
  ? queryTab
  : (pending.value.length || !active.value.length ? 'pending' : 'active')

const detailOpen = ref(false)
const detailReq = ref<CollabRequest | null>(null)
const actionError = ref('')
const briefFacts = computed(() => [
  { label: 'Pedida', value: detailReq.value ? relativeTime(detailReq.value.createdAt) : null },
  ...(detailReq.value && detailReq.value.status !== 'requested' ? [{ label: 'Resuelta', value: relativeTime(detailReq.value.updatedAt) }] : [])
])

// Fase 2 de la reorganización de navegación: Nivel 1 (quién/estado/brief
// corto/acción del momento) queda fijo y siempre visible; Brief, Calendario
// y Registro pasan a pestañas — consulta ocasional, nunca compitiendo con
// la acción principal.
const detailTab = ref<'brief' | 'calendar' | 'log'>('brief')
const detailTabs = [
  { value: 'brief', label: 'Brief' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'log', label: 'Registro' }
]
const expandedPostId = ref<string | null>(null)

function openDetail(req: CollabRequest) {
  detailReq.value = req
  actionError.value = ''
  detailTab.value = 'brief'
  expandedPostId.value = null
  detailOpen.value = true
}

const collaborationPosts = computed(() => myPosts.value.filter((p) => p.collaborationId === detailReq.value?.id))
const expandedPost = computed(() => collaborationPosts.value.find((p) => p.id === expandedPostId.value) ?? null)

function toggleExpandedPost(post: { id: string }) {
  expandedPostId.value = expandedPostId.value === post.id ? null : post.id
}

// Enlace directo (`?collaboration=<id>`, desde un aviso o el chat): abre esa
// colaboración en su grupo de la lista y, con `&post=<id>`, la pestaña
// Calendario con esa publicación desplegada. Antes los enlaces llevaban solo a
// la lista y había que buscarla.
function openFromQuery() {
  const id = route.query.collaboration
  const match = typeof id === 'string' ? requests.value.find((r) => r.id === id) : undefined
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

// Consultar el checklist de un entregable sin salir de la colaboración — ya
// no hace falta ir al Tablero y buscar el mismo post ahí (auditoría de
// usabilidad, pestaña Calendario). Solo lectura aquí: editar el checklist
// sigue siendo tarea del Tablero, que ya lo hace.
const { itemsByPost, ensureItems } = useChecklist()
const expandedPostChecklist = computed(() => (expandedPostId.value ? itemsByPost.value[expandedPostId.value] ?? [] : []))
watch(expandedPostId, (id) => { if (id) ensureItems(id) })

// Antes `accept`/`decline` se llamaban sin esperar su resultado y la hoja
// se cerraba al instante — si el update a Supabase fallaba, parecía que
// había funcionado sin haber cambiado nada de verdad.
async function handleAccept(amount: number | null) {
  if (!detailReq.value) return
  actionError.value = ''
  try {
    await accept(detailReq.value.id, amount)
    detailOpen.value = false
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'No se ha podido aceptar la solicitud. Inténtalo de nuevo.'
  }
}

async function handleDecline() {
  if (!detailReq.value) return
  actionError.value = ''
  try {
    await decline(detailReq.value.id)
    detailOpen.value = false
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'No se ha podido rechazar la solicitud. Inténtalo de nuevo.'
  }
}

async function handleMarkCompleted() {
  if (!detailReq.value) return
  const ok = await confirm({
    title: '¿Marcar como completada?',
    message: 'Indica que el trabajo de esta colaboración ya se ha entregado. No afecta al pago.',
    confirmLabel: 'Marcar como completada'
  })
  if (!ok) return
  actionError.value = ''
  try {
    await markCompleted(detailReq.value.id)
    detailReq.value = requests.value.find((r) => r.id === detailReq.value!.id) ?? detailReq.value
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'No se ha podido marcar como completada. Inténtalo de nuevo.'
  }
}
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
        :hint="req.status === 'requested' ? (req.initiatedBy === 'partner' ? 'Te toca responder' : 'Esperando al partner') : undefined"
        @open="openDetail(req)"
      />
    </div>

    <BottomSheet v-model="detailOpen" :title="detailReq?.partnerName ?? 'Solicitud'">
      <template v-if="detailReq">
        <CollabParty :name="detailReq.partnerName" :status="detailReq.status" :brief="detailReq.brief">
          <CollaborationChatButton :counterpart-profile-id="detailReq.partnerProfileId" :counterpart-name="detailReq.partnerName" />
        </CollabParty>

        <!-- Nivel 1: la acción del momento, siempre visible, nunca dentro de una pestaña.
             El panel se muestra en todos los estados (antes solo en "requested"): tras
             aceptar es el único sitio del detalle con el precio acordado. -->
        <div class="collab-actions">
          <NegotiationPanel
            :collaboration-id="detailReq.id" :initial-budget-cents="detailReq.budgetCents" :status="detailReq.status"
            my-role="creator" :initiated-by="detailReq.initiatedBy"
            @accept="handleAccept" @decline="handleDecline"
          />
          <BaseButton
            v-if="detailReq.status === 'accepted' || detailReq.status === 'in_progress'"
            variant="secondary" block :loading="acting === detailReq.id"
            @click="handleMarkCompleted"
          >
            Marcar como completada
          </BaseButton>
          <RatingPrompt
            v-else-if="detailReq.status === 'completed'"
            :collaboration-id="detailReq.id" :counterpart-name="detailReq.partnerName"
          />
          <p v-if="actionError" class="collab-error" role="alert">{{ actionError }}</p>
        </div>

        <!-- Nivel 2: consulta ocasional, bajo pestañas — ninguna tarea habitual exige cruzarlas. -->
        <SegmentedTabs v-model="detailTab" :options="detailTabs" class="mb-4" />

        <div v-show="detailTab === 'brief'">
          <p class="collab-brief">{{ detailReq.brief }}</p>
          <CollaborationTermsCard :terms="detailReq" :collaboration-id="detailReq.id" :status="detailReq.status" :package-info="{ title: detailReq.packageTitle, description: detailReq.packageDescription, deliverables: detailReq.packageDeliverables }" />
          <DataList :items="briefFacts" />
          <p v-if="detailReq.paidAt" class="collab-paid mt-3">
            <Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(detailReq.paidAt) }}
          </p>
        </div>

        <div v-show="detailTab === 'calendar'">
          <WeekBoard :posts="collaborationPosts" :has-any-posts="false" :two-column="false" @open="toggleExpandedPost" />
          <CollabPostPreview v-if="expandedPost" :post="expandedPost" :checklist="expandedPostChecklist">
            <NuxtLink :to="`/creator/post/${expandedPost.id}`" class="inline-flex items-center gap-1 mt-3 text-sm font-semibold underline">
              Editar esta publicación <Icon name="ph:arrow-right-bold" class="size-3.5" />
            </NuxtLink>
          </CollabPostPreview>
        </div>

        <div v-show="detailTab === 'log'">
          <CollaborationLogCard :collaboration-id="detailReq.id" :counterpart-name="detailReq.partnerName" />
        </div>
      </template>
    </BottomSheet>
  </AppShell>
</template>

<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { collaborationStatusMeta, relativeTime } from '~/utils/status'
import { initialsFromName, hueFromString } from '~/utils/avatar'
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
    <SegmentedTabs v-model="tab" :options="tabs" class="mb-5" />

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

    <div v-else class="flex flex-col gap-2.5 md:max-w-xl">
      <button v-for="req in visible" :key="req.id" type="button" class="text-left" @click="openDetail(req)">
        <BaseCard radius="lg" padding="md" interactive>
          <div class="flex items-start gap-3 mb-3">
            <BaseAvatar :initials="initialsFromName(req.partnerName)" :hue="hueFromString(req.partnerName)" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ req.partnerName }}</p>
                <span class="text-[0.9375rem] font-medium text-[var(--color-text)] shrink-0">
                  {{ req.budgetCents ? formatEuros(req.budgetCents) : 'Sin presupuesto' }}
                </span>
              </div>
              <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">{{ relativeTime(req.createdAt) }}</p>
            </div>
          </div>

          <p class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mb-3 line-clamp-2">{{ req.brief }}</p>

          <span
            class="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-xs)] text-[0.75rem] font-medium"
            :style="{
              color: collaborationStatusMeta[req.status].color,
              background: `color-mix(in oklab, ${collaborationStatusMeta[req.status].color} 16%, transparent)`
            }"
          >
            {{ collaborationStatusMeta[req.status].label }}
          </span>
        </BaseCard>
      </button>
    </div>

    <BottomSheet v-model="detailOpen" :title="detailReq?.partnerName ?? 'Solicitud'">
      <template v-if="detailReq">
        <div class="flex items-center gap-3 mb-5">
          <BaseAvatar :initials="initialsFromName(detailReq.partnerName)" :hue="hueFromString(detailReq.partnerName)" size="lg" />
          <div class="min-w-0 flex-1">
            <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ detailReq.partnerName }}</p>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-xs)] text-[0.75rem] font-medium mt-1"
              :style="{
                color: collaborationStatusMeta[detailReq.status].color,
                background: `color-mix(in oklab, ${collaborationStatusMeta[detailReq.status].color} 16%, transparent)`
              }"
            >
              {{ collaborationStatusMeta[detailReq.status].label }}
            </span>
          </div>
          <CollaborationChatButton :counterpart-profile-id="detailReq.partnerProfileId" :counterpart-name="detailReq.partnerName" />
        </div>

        <p class="text-[0.8125rem] text-[var(--color-text-muted)] line-clamp-1 mb-4">{{ detailReq.brief }}</p>

        <!-- Nivel 1: la acción del momento, siempre visible, nunca dentro de una pestaña.
             El panel se muestra en todos los estados (antes solo en "requested"): tras
             aceptar es el único sitio del detalle con el precio acordado. -->
        <div class="mb-5">
          <NegotiationPanel
            :collaboration-id="detailReq.id" :initial-budget-cents="detailReq.budgetCents" :status="detailReq.status"
            my-role="creator" :initiated-by="detailReq.initiatedBy"
            @accept="handleAccept" @decline="handleDecline"
          />
          <BaseButton
            v-if="detailReq.status === 'accepted' || detailReq.status === 'in_progress'"
            variant="secondary" size="md" class="w-full mt-3" :disabled="acting === detailReq.id" :icon-spin="acting === detailReq.id"
            @click="handleMarkCompleted"
          >
            Marcar como completada
          </BaseButton>
          <RatingPrompt
            v-else-if="detailReq.status === 'completed'"
            :collaboration-id="detailReq.id" :counterpart-name="detailReq.partnerName"
          />
          <p v-if="actionError" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-3">{{ actionError }}</p>
        </div>

        <!-- Nivel 2: consulta ocasional, bajo pestañas — ninguna tarea habitual exige cruzarlas. -->
        <SegmentedTabs v-model="detailTab" :options="detailTabs" class="mb-4" />

        <div v-show="detailTab === 'brief'">
          <p class="text-[0.9375rem] text-[var(--color-text)] leading-relaxed mb-5">{{ detailReq.brief }}</p>
          <CollaborationTermsCard :terms="detailReq" :collaboration-id="detailReq.id" :status="detailReq.status" :package-info="{ title: detailReq.packageTitle, description: detailReq.packageDescription, deliverables: detailReq.packageDeliverables }" />
          <dl class="flex flex-col gap-3 mb-5 text-[0.8125rem]">
            <div class="flex items-center justify-between">
              <dt class="text-[var(--color-text-muted)]">Pedida</dt>
              <dd class="text-[var(--color-text)]">{{ relativeTime(detailReq.createdAt) }}</dd>
            </div>
            <div v-if="detailReq.status !== 'requested'" class="flex items-center justify-between">
              <dt class="text-[var(--color-text-muted)]">Resuelta</dt>
              <dd class="text-[var(--color-text)]">{{ relativeTime(detailReq.updatedAt) }}</dd>
            </div>
          </dl>
          <p v-if="detailReq.paidAt" class="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-status-published)]">
            <Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(detailReq.paidAt) }}
          </p>
        </div>

        <div v-show="detailTab === 'calendar'">
          <WeekBoard :posts="collaborationPosts" :has-any-posts="false" :two-column="false" @open="toggleExpandedPost" />
          <BaseCard v-if="expandedPost" radius="md" padding="md" class="mt-3">
            <div class="flex items-center gap-3 mb-3">
              <div class="relative size-12 shrink-0 rounded-[var(--radius-xs)] overflow-hidden flex items-center justify-center" :style="!expandedPost.mediaUrl ? { background: `linear-gradient(135deg, ${expandedPost.cover.from}, ${expandedPost.cover.to})` } : undefined">
                <img v-if="expandedPost.mediaUrl" :src="expandedPost.mediaUrl" alt="" class="absolute inset-0 size-full object-cover">
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[0.875rem] font-medium text-[var(--color-text)] truncate">{{ expandedPost.title }}</p>
                <StatusPill :status="expandedPost.status" compact />
              </div>
            </div>
            <p v-if="expandedPost.caption" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mb-3">{{ expandedPost.caption }}</p>
            <ul v-if="expandedPostChecklist.length" class="flex flex-col gap-1.5">
              <li v-for="item in expandedPostChecklist" :key="item.id" class="flex items-center gap-2 text-[0.8125rem]">
                <Icon :name="item.done ? 'ph:check-square-fill' : 'ph:square-bold'" class="size-4 shrink-0" :class="item.done ? 'text-[var(--color-status-published)]' : 'text-[var(--color-text-faint)]'" />
                <span :class="item.done ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'">{{ item.text }}</span>
              </li>
            </ul>
            <NuxtLink :to="`/creator/post/${expandedPost.id}`" class="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] mt-3">
              Editar esta publicación <Icon name="ph:arrow-right-bold" class="size-3.5" />
            </NuxtLink>
          </BaseCard>
        </div>

        <div v-show="detailTab === 'log'">
          <CollaborationLogCard :collaboration-id="detailReq.id" :counterpart-name="detailReq.partnerName" />
        </div>
      </template>
    </BottomSheet>
  </AppShell>
</template>

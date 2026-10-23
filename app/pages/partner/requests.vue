<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { collaborationStatusMeta, relativeTime } from '~/utils/status'
import { initialsFromName, hueFromString } from '~/utils/avatar'
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

const tab = ref<'pending' | 'history'>('pending')
const tabs = computed(() => [
  { value: 'pending', label: pendingCount.value ? `Pendientes (${pendingCount.value})` : 'Pendientes' },
  { value: 'history', label: 'Historial' }
])

const newestFirst = (list: typeof collaborations.value) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

const pending = computed(() => newestFirst(collaborations.value.filter((c) => c.status === 'requested')))
const history = computed(() => newestFirst(collaborations.value.filter((c) => c.status !== 'requested')))
const visible = computed(() => (tab.value === 'pending' ? pending.value : history.value))

const detailOpen = ref(false)
const detailCollab = ref<MyCollaboration | null>(null)
const actionError = ref('')

// Fase 2: Nivel 1 (quién/estado/brief corto/acción del momento) fijo;
// Brief, Calendario y Registro pasan a pestañas.
const detailTab = ref<'brief' | 'calendar' | 'log'>('brief')
const detailTabs = [
  { value: 'brief', label: 'Brief' },
  { value: 'calendar', label: 'Calendario' },
  { value: 'log', label: 'Registro' }
]
const expandedPostId = ref<string | null>(null)

function openDetail(collab: MyCollaboration) {
  detailCollab.value = collab
  actionError.value = ''
  detailTab.value = 'brief'
  expandedPostId.value = null
  detailOpen.value = true
}

// Al volver de Stripe (éxito o cancelación) se reabre automáticamente la
// misma colaboración que se estaba pagando — sin esto, "volver al mismo
// sitio" solo habría significado la lista, no el contexto real en el que
// se estaba antes de ir a pagar.
const returnedCollabId = route.query.collaboration as string | undefined
if (returnedCollabId) {
  const match = collaborations.value.find((c) => c.id === returnedCollabId)
  if (match) openDetail(match)
}

const collaborationPosts = computed(() => partnerPosts.value.filter((p) => p.collaborationId === detailCollab.value?.id))
const expandedPost = computed(() => collaborationPosts.value.find((p) => p.id === expandedPostId.value) ?? null)

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
    <BaseCard v-if="route.query.payment" radius="md" padding="md" class="flex items-center gap-3 mb-5">
      <Icon
        :name="route.query.payment === 'success' ? 'ph:check-circle-fill' : 'ph:info-fill'" class="size-5 shrink-0"
        :class="route.query.payment === 'success' ? 'text-[var(--color-status-published)]' : 'text-[var(--color-text-muted)]'"
      />
      <p class="text-[0.875rem] text-[var(--color-text)]">
        {{ route.query.payment === 'success' ? 'Pago enviado.' : 'Pago cancelado, no se ha cobrado nada.' }}
      </p>
    </BaseCard>

    <SegmentedTabs v-model="tab" :options="tabs" class="mb-5" />

    <EmptyState
      v-if="!visible.length && tab === 'pending'"
      icon="ph:handshake" title="Sin solicitudes pendientes"
      description="Contacta a un creador de contenido desde 'Descubrir', o espera a que te encuentren ellos."
    />
    <EmptyState
      v-else-if="!visible.length"
      icon="ph:clock-counter-clockwise" title="Todavía no hay historial"
      description="Las solicitudes que se acepten o rechacen se guardan aquí."
    />

    <div v-else class="flex flex-col gap-2.5 md:max-w-xl">
      <button v-for="collab in visible" :key="collab.id" type="button" class="text-left" @click="openDetail(collab)">
        <BaseCard radius="lg" padding="md" interactive>
          <div class="flex items-start gap-3 mb-3">
            <BaseAvatar :initials="initialsFromName(collab.creatorName ?? '?')" :hue="hueFromString(collab.creatorName ?? '')" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ collab.creatorName ?? 'Sin asignar' }}</p>
                <span class="text-[0.9375rem] font-medium text-[var(--color-text)] shrink-0">
                  {{ collab.budgetCents ? formatEuros(collab.budgetCents) : 'Sin presupuesto' }}
                </span>
              </div>
              <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">{{ relativeTime(collab.createdAt) }}</p>
            </div>
          </div>

          <p class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mb-3 line-clamp-2">{{ collab.brief }}</p>

          <span
            class="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-xs)] text-[0.75rem] font-medium"
            :style="{
              color: collaborationStatusMeta[collab.status].color,
              background: `color-mix(in oklab, ${collaborationStatusMeta[collab.status].color} 16%, transparent)`
            }"
          >
            {{ collaborationStatusMeta[collab.status].label }}
          </span>
        </BaseCard>
      </button>
    </div>

    <BottomSheet v-model="detailOpen" :title="detailCollab?.creatorName ?? 'Solicitud'">
      <template v-if="detailCollab">
        <div class="flex items-center gap-3 mb-5">
          <BaseAvatar
            :initials="initialsFromName(detailCollab.creatorName ?? '?')" :hue="hueFromString(detailCollab.creatorName ?? '')"
            size="lg"
          />
          <div class="min-w-0">
            <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ detailCollab.creatorName ?? 'Sin asignar' }}</p>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-xs)] text-[0.75rem] font-medium mt-1"
              :style="{
                color: collaborationStatusMeta[detailCollab.status].color,
                background: `color-mix(in oklab, ${collaborationStatusMeta[detailCollab.status].color} 16%, transparent)`
              }"
            >
              {{ collaborationStatusMeta[detailCollab.status].label }}
            </span>
          </div>
        </div>

        <p class="text-[0.8125rem] text-[var(--color-text-muted)] line-clamp-1 mb-4">{{ detailCollab.brief }}</p>

        <!-- Nivel 1: la acción del momento, siempre visible, nunca dentro de una pestaña. -->
        <div class="mb-5">
          <NegotiationPanel
            :collaboration-id="detailCollab.id" :initial-budget-cents="detailCollab.budgetCents" :status="detailCollab.status"
            my-role="partner" :initiated-by="detailCollab.initiatedBy"
            @accept="handleAccept" @decline="handleDecline"
          />

          <p v-if="detailCollab.paidAt" class="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-status-published)] mt-3">
            <Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(detailCollab.paidAt) }}
          </p>
          <BaseButton
            v-else-if="payableStatuses.includes(detailCollab.status)"
            variant="primary" size="md" class="w-full mt-3" :disabled="!detailCollab.budgetCents || paying === detailCollab.id" :icon-spin="paying === detailCollab.id"
            @click="confirmPay(detailCollab.id)"
          >
            {{ paying === detailCollab.id ? 'Abriendo pago…' : 'Pagar' }}
          </BaseButton>
          <p v-if="payError && lastPayAttemptId === detailCollab.id" class="text-[0.75rem] text-[var(--color-status-alert)] mt-2">{{ payError }}</p>

          <BaseButton
            v-if="detailCollab.status === 'accepted' || detailCollab.status === 'in_progress'"
            variant="secondary" size="md" class="w-full mt-3" :disabled="acting === detailCollab.id" :icon-spin="acting === detailCollab.id"
            @click="handleMarkCompleted"
          >
            Marcar como completada
          </BaseButton>
          <RatingPrompt
            v-else-if="detailCollab.status === 'completed'"
            :collaboration-id="detailCollab.id" :counterpart-name="detailCollab.creatorName ?? 'el creador'"
          />
          <p v-if="actionError" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-3">{{ actionError }}</p>
        </div>

        <!-- Nivel 2: consulta ocasional, bajo pestañas — ninguna tarea habitual exige cruzarlas. -->
        <SegmentedTabs v-model="detailTab" :options="detailTabs" class="mb-4" />

        <div v-show="detailTab === 'brief'">
          <p class="text-[0.9375rem] text-[var(--color-text)] leading-relaxed mb-5">{{ detailCollab.brief }}</p>
          <CollaborationTermsCard :terms="detailCollab" :collaboration-id="detailCollab.id" />
          <dl class="flex flex-col gap-3 text-[0.8125rem]">
            <div class="flex items-center justify-between">
              <dt class="text-[var(--color-text-muted)]">Pedida</dt>
              <dd class="text-[var(--color-text)]">{{ relativeTime(detailCollab.createdAt) }}</dd>
            </div>
          </dl>
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
          </BaseCard>
        </div>

        <div v-show="detailTab === 'log'">
          <CollaborationLogCard :collaboration-id="detailCollab.id" :counterpart-name="detailCollab.creatorName ?? 'el creador'" />
        </div>
      </template>
    </BottomSheet>
  </AppShell>
</template>

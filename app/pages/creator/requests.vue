<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { collaborationStatusMeta, relativeTime } from '~/utils/status'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { CollabRequest } from '~/composables/useCollabRequests'

useHead({ title: 'Solicitudes' })

const { requests, pendingCount, acting, ensureLoaded, accept, decline, markCompleted } = useCollabRequests()
const { confirm } = useConfirm()
await ensureLoaded()

const tab = ref<'pending' | 'history'>('pending')
const tabs = computed(() => [
  { value: 'pending', label: pendingCount.value ? `Pendientes (${pendingCount.value})` : 'Pendientes' },
  { value: 'history', label: 'Historial' }
])

const newestFirst = (list: typeof requests.value) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

const pending = computed(() => newestFirst(requests.value.filter((r) => r.status === 'requested')))
const history = computed(() => newestFirst(requests.value.filter((r) => r.status !== 'requested')))
const visible = computed(() => (tab.value === 'pending' ? pending.value : history.value))

const detailOpen = ref(false)
const detailReq = ref<CollabRequest | null>(null)
const actionError = ref('')
function openDetail(req: CollabRequest) {
  detailReq.value = req
  actionError.value = ''
  detailOpen.value = true
}

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
  <AppShell role="creator" title="Solicitudes" subtitle="Tus colaboraciones con partners">
    <SegmentedTabs v-model="tab" :options="tabs" class="mb-5" />

    <EmptyState
      v-if="!visible.length && tab === 'pending'"
      icon="ph:handshake" title="Sin solicitudes pendientes"
      description="Cuando contactes a un partner (o te contacten a ti) desde 'Descubrir', aparecerá aquí."
    />
    <EmptyState
      v-else-if="!visible.length"
      icon="ph:clock-counter-clockwise" title="Todavía no hay historial"
      description="Las solicitudes que aceptes o rechaces se guardan aquí."
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
          <div class="min-w-0">
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
        </div>

        <p class="text-[0.9375rem] text-[var(--color-text)] leading-relaxed mb-5">{{ detailReq.brief }}</p>

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

        <p v-if="detailReq.paidAt" class="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-status-published)] mb-4">
          <Icon name="ph:check-circle-fill" class="size-4" /> Cobrado el {{ relativeTime(detailReq.paidAt) }}
        </p>

        <NegotiationPanel
          v-if="detailReq.status === 'requested'"
          :collaboration-id="detailReq.id" :initial-budget-cents="detailReq.budgetCents" :status="detailReq.status"
          my-role="creator" :initiated-by="detailReq.initiatedBy"
          @accept="handleAccept" @decline="handleDecline"
        />
        <BaseButton
          v-else-if="detailReq.status === 'accepted' || detailReq.status === 'in_progress'"
          variant="secondary" size="md" class="w-full" :disabled="acting === detailReq.id" :icon-spin="acting === detailReq.id"
          @click="handleMarkCompleted"
        >
          Marcar como completada
        </BaseButton>
        <p v-if="actionError" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-3">{{ actionError }}</p>
      </template>
    </BottomSheet>
  </AppShell>
</template>

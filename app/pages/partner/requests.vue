<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { collaborationStatusMeta, relativeTime } from '~/utils/status'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { MyCollaboration } from '~/composables/useMyCollaborations'

useHead({ title: 'Solicitudes' })

const { collaborations, ensureLoaded, accept, decline } = useMyCollaborations()
await ensureLoaded()

const pendingCount = computed(() => collaborations.value.filter((c) => c.status === 'requested').length)

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
function openDetail(collab: MyCollaboration) {
  detailCollab.value = collab
  detailOpen.value = true
}
</script>

<template>
  <AppShell role="partner" title="Solicitudes" subtitle="Tus colaboraciones con creadores de contenido">
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
      <BaseCard v-for="collab in visible" :key="collab.id" radius="lg" padding="md" interactive @click="openDetail(collab)">
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

        <p class="text-[0.9375rem] text-[var(--color-text)] leading-relaxed mb-5">{{ detailCollab.brief }}</p>

        <dl class="flex flex-col gap-3 mb-5 text-[0.8125rem]">
          <div class="flex items-center justify-between">
            <dt class="text-[var(--color-text-muted)]">Pedida</dt>
            <dd class="text-[var(--color-text)]">{{ relativeTime(detailCollab.createdAt) }}</dd>
          </div>
        </dl>

        <NegotiationPanel
          :collaboration-id="detailCollab.id" :initial-budget-cents="detailCollab.budgetCents" :status="detailCollab.status"
          my-role="partner" :initiated-by="detailCollab.initiatedBy"
          @accept="(amount) => { accept(detailCollab!.id, amount); detailOpen = false }"
          @decline="() => { decline(detailCollab!.id); detailOpen = false }"
        />
      </template>
    </BottomSheet>
  </AppShell>
</template>

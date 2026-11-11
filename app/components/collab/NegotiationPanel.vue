<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import type { CollaborationStatus, Role } from '~/types'
import type { ReportReason } from '~/composables/useReports'

const props = defineProps<{
  collaborationId: string
  initialBudgetCents: number | null
  status: CollaborationStatus
  myRole: Role
  initiatedBy: Role
}>()

const emit = defineEmits<{ accept: [budgetCents: number | null]; decline: [] }>()

const { offersByCollaboration, posting, ensureOffers, proposeOffer } = useCollaborationOffers()
const { reporting, reportCollaboration } = useReports()

// Sin `await` a nivel de script: este componente se monta/desmonta con la
// hoja inferior (v-if en BottomSheet), fuera del Suspense inicial de la
// página — un top-level await aquí no tiene quien lo espere.
onMounted(() => ensureOffers(props.collaborationId))
const offers = computed(() => offersByCollaboration.value[props.collaborationId] ?? [])

// La propuesta inicial es de quien contactó primero (`initiatedBy` — puede
// ser cualquiera de los dos desde /creator/discover y /partner/discover) —
// a partir de ahí, cada fila de `offers` es un turno alternado.
const currentAmount = computed(() => {
  const last = offers.value.at(-1)
  return last ? last.budgetCents : props.initialBudgetCents
})
const currentProposer = computed<Role>(() => offers.value.at(-1)?.proposedBy ?? props.initiatedBy)
const myTurn = computed(() => props.status === 'requested' && currentProposer.value !== props.myRole)
const otherRoleLabel = computed(() => (props.myRole === 'creator' ? 'del partner' : 'del creador'))
const initiatorLabel = computed(() => (props.initiatedBy === 'partner' ? 'partner' : 'creador'))

// Tras aceptar, la cifra de `collaborations.budget_cents` ya es el precio ACORDADO,
// no la propuesta inicial (C-03 de docs/audit/08_COLLABORATION_FLOW_AUDIT.md).
const isAgreed = computed(() => ['accepted', 'in_progress', 'completed'].includes(props.status))

const countering = ref(false)
const counterEuros = ref<number | null>(null)
const counterMessage = ref('')

// Rechazar no se deshace — confirmación en dos pasos para que no se vaya
// sin querer desde el pulgar en móvil (ver app/pages/creator/requests.vue).
const confirmingDecline = ref(false)

const counterError = ref('')

async function sendCounter() {
  if (!counterEuros.value || counterEuros.value <= 0) return
  counterError.value = ''
  try {
    await proposeOffer({
      collaborationId: props.collaborationId,
      proposedBy: props.myRole,
      budgetCents: Math.round(counterEuros.value * 100),
      message: counterMessage.value || undefined
    })
    countering.value = false
    counterEuros.value = null
    counterMessage.value = ''
  } catch (e) {
    counterError.value = e instanceof Error ? e.message : 'No se ha podido enviar la contraoferta. Inténtalo de nuevo.'
  }
}

const reportOpen = ref(false)
const reportSent = ref(false)
const reportReason = ref<ReportReason>('spam')
const reportDetail = ref('')
const reportReasons: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'unrealistic_budget', label: 'Presupuesto poco serio' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'other', label: 'Otro motivo' }
]

const reportError = ref('')

async function sendReport() {
  reportError.value = ''
  try {
    await reportCollaboration(props.collaborationId, reportReason.value, reportDetail.value || undefined)
    reportSent.value = true
  } catch (e) {
    reportError.value = e instanceof Error ? e.message : 'No se ha podido enviar el reporte. Inténtalo de nuevo.'
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-2 mb-5">
      <div class="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] px-3 py-2 text-sm">
        <span class="text-[var(--color-text-muted)]">{{ isAgreed ? 'Precio acordado' : `Propuesta inicial (${initiatorLabel})` }}</span>
        <span class="font-medium text-[var(--color-text)]">{{ initialBudgetCents ? formatEuros(initialBudgetCents) : 'Sin fijar' }}</span>
      </div>

      <div v-for="offer in (isAgreed ? [] : offers)" :key="offer.id" class="rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] px-3 py-2 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-[var(--color-text-muted)]">
            Contraoferta {{ offer.proposedBy === 'creator' ? 'del creador' : 'de la marca' }} · {{ relativeTime(offer.createdAt) }}
          </span>
          <span class="font-medium text-[var(--color-text)]">{{ formatEuros(offer.budgetCents) }}</span>
        </div>
        <p v-if="offer.message" class="text-[var(--color-text-faint)] mt-1">{{ offer.message }}</p>
      </div>
    </div>

    <template v-if="status === 'requested'">
      <p v-if="!myTurn" class="text-sm text-[var(--color-text-faint)] mb-4">
        Esperando respuesta {{ otherRoleLabel }}.
      </p>

      <template v-else>
        <div v-if="countering" class="flex flex-col gap-3 mb-4">
          <input
            v-model.number="counterEuros" type="number" min="1" step="1" placeholder="Nuevo importe (€)"
            class="input w-full h-11"
          >
          <textarea
            v-model="counterMessage" rows="2" placeholder="Mensaje opcional, p. ej. por qué…"
            class="textarea w-full resize-none"
          />
          <div class="flex gap-2.5">
            <BaseButton variant="secondary" size="sm" class="flex-1" @click="countering = false">Cancelar</BaseButton>
            <BaseButton
              variant="primary" size="sm" class="flex-1" :disabled="!counterEuros || posting" :icon-spin="posting"
              @click="sendCounter"
            >
              Enviar contraoferta
            </BaseButton>
          </div>
          <p v-if="counterError" class="text-micro text-[var(--color-status-alert)]">{{ counterError }}</p>
        </div>

        <div v-else-if="confirmingDecline" class="flex items-center gap-2.5 mb-4">
          <p class="text-sm text-[var(--color-text-muted)] flex-1">¿Seguro? No se puede deshacer.</p>
          <BaseButton variant="secondary" size="sm" @click="confirmingDecline = false">Cancelar</BaseButton>
          <BaseButton variant="danger" size="sm" @click="$emit('decline')">Sí, rechazar</BaseButton>
        </div>

        <div v-else class="flex flex-col gap-2.5 mb-4">
          <div class="flex gap-2.5">
            <BaseButton variant="secondary" size="sm" class="flex-1" @click="confirmingDecline = true">Rechazar</BaseButton>
            <BaseButton variant="primary" size="sm" class="flex-1" @click="$emit('accept', currentAmount)">
              Aceptar{{ currentAmount ? ` · ${formatEuros(currentAmount)}` : '' }}
            </BaseButton>
          </div>
          <button type="button" class="text-sm font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] transition-colors" @click="countering = true">
            Hacer contraoferta
          </button>
        </div>
      </template>
    </template>

    <div class="pt-3 mt-1 border-t border-[var(--color-hairline)]">
      <button v-if="!reportOpen && !reportSent" type="button" class="text-micro text-[var(--color-text-muted)] hover:text-[var(--color-status-alert)] transition-colors" @click="reportOpen = true">
        Reportar esta solicitud
      </button>
      <p v-else-if="reportSent" class="text-micro text-[var(--color-text-muted)]">Gracias, la revisaremos.</p>
      <div v-else class="flex flex-col gap-2.5">
        <select
          v-model="reportReason"
          class="select w-full h-9"
        >
          <option v-for="r in reportReasons" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
        <textarea
          v-model="reportDetail" rows="2" placeholder="Detalles (opcional)…"
          class="textarea w-full resize-none"
        />
        <div class="flex gap-2.5">
          <BaseButton variant="secondary" size="sm" class="flex-1" @click="reportOpen = false">Cancelar</BaseButton>
          <BaseButton variant="danger" size="sm" class="flex-1" :disabled="reporting" :icon-spin="reporting" @click="sendReport">
            Enviar reporte
          </BaseButton>
        </div>
        <p v-if="reportError" class="text-micro text-[var(--color-status-alert)]">{{ reportError }}</p>
      </div>
    </div>
  </div>
</template>

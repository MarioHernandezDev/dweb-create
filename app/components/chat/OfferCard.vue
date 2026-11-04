<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { offerCopy } from '~/utils/chat-view'
import type { Offer } from '~/composables/useOffers'

/**
 * Tarjeta de la oferta inicial del chat (A-R20c). Dice QUÉ paquete, quién la
 * envía, el precio, el estado con texto e icono, y qué le toca a cada parte;
 * si ya se aceptó entre un creador y un partner, enlaza con la colaboración
 * que creó `respond_offer` (solo si de verdad existe). Las reglas no cambian:
 * solo el destinatario puede responder, y eso lo aplica el servidor.
 */
const props = defineProps<{ offerId: string; mine: boolean; otherName: string; myRole: 'creator' | 'partner' }>()

const { offersById, responding, ensureOffer, respondOffer, resolvePackageTitle } = useOffers()
const { confirm } = useConfirm()
const { myPackages } = usePackages()
const { refreshMessages, refreshConversations } = useChat()
const client = useSupabaseClient()

const offer = computed<Offer | undefined>(() => offersById.value[props.offerId])
const packageTitle = ref<string | null>(null)
const respondError = ref('')
const loaded = ref(false)
const collaborationCreated = ref(false)
const collaborationId = ref<string | null>(null)

async function checkCollaboration() {
  if (offer.value?.status !== 'accepted') return
  const { data } = await client.from('collaborations').select('id').eq('offer_id', props.offerId).maybeSingle()
  collaborationCreated.value = !!data
  collaborationId.value = (data as { id: string } | null)?.id ?? null
}

// Sin `await` a nivel de módulo: este componente puede montarse dinámicamente
// (un mensaje de oferta que llega por Realtime), sin garantía de <Suspense>.
onMounted(async () => {
  await ensureOffer(props.offerId)
  loaded.value = true
  checkCollaboration()
})
watch(() => offer.value?.status, () => checkCollaboration())

watchEffect(async () => {
  if (!offer.value) return
  // Paquete borrado (A-R20i): la oferta se conserva y se enseña el título guardado en ella.
  if (!offer.value.packageId) {
    packageTitle.value = offer.value.packageTitle
    return
  }
  const local = myPackages.value?.find((p) => p.id === offer.value!.packageId)
  packageTitle.value = local ? local.title : await resolvePackageTitle(offer.value.packageId)
})

const statusMeta: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pendiente', color: 'var(--color-status-review)', icon: 'ph:hourglass-medium-fill' },
  accepted: { label: 'Aceptada', color: 'var(--color-status-published)', icon: 'ph:check-circle-fill' },
  declined: { label: 'Rechazada', color: 'var(--color-status-alert)', icon: 'ph:x-circle-fill' }
}

const copy = computed(() => offer.value
  ? offerCopy({ status: offer.value.status, mine: props.mine, otherName: props.otherName, collaborationCreated: collaborationCreated.value })
  : null)
const canRespond = computed(() => !props.mine && offer.value?.status === 'pending')

// No basta con esperar a Realtime para ver el resultado de tu propia acción
// (el mensaje de sistema que inserta respond_offer): se refresca en local al momento.
async function respond(accept: boolean) {
  if (!offer.value) return
  respondError.value = ''
  try {
    const updated = await respondOffer(offer.value.id, accept)
    await Promise.all([refreshMessages(updated.conversationId), refreshConversations()])
    useOffers().refreshPendingIncoming()
  } catch (e) {
    respondError.value = e instanceof Error ? e.message : 'No se ha podido responder a la oferta.'
  }
}

async function declineWithConfirm() {
  const ok = await confirm({
    title: '¿Rechazar esta oferta?',
    message: 'No podrás cambiar de opinión después — la otra persona lo verá al instante.',
    confirmLabel: 'Rechazar', tone: 'danger'
  })
  if (ok) await respond(false)
}
</script>

<template>
  <div v-if="offer && copy" class="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-paper)] p-4 shadow-sm" data-offer-card :data-status="offer.status">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">{{ copy.heading }}</p>
        <p class="mt-0.5 truncate text-[0.9375rem] font-medium text-[var(--color-text)]">{{ packageTitle ?? 'Paquete' }}</p>
      </div>
      <span class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium" :style="{ color: statusMeta[offer.status]!.color, backgroundColor: 'color-mix(in oklab, ' + statusMeta[offer.status]!.color + ' 14%, transparent)' }">
        <Icon :name="statusMeta[offer.status]!.icon" class="size-3.5" /> {{ statusMeta[offer.status]!.label }}
      </span>
    </div>

    <p v-if="!offer.packageId" class="mt-1 text-[0.75rem] text-[var(--color-text-faint)]" data-package-gone>Este paquete ya no está disponible.</p>
    <p class="mt-2 font-display text-[1.375rem] leading-none text-[var(--color-text)]">{{ formatEuros(offer.proposedPriceCents) }}</p>
    <p v-if="offer.message" class="mt-2 whitespace-pre-wrap break-words text-[0.8125rem] text-[var(--color-text-muted)]">{{ offer.message }}</p>

    <p class="mt-3 text-[0.8125rem] text-[var(--color-text-muted)]" data-offer-consequence>{{ copy.consequence }}</p>
    <NuxtLink v-if="offer.status === 'accepted' && collaborationCreated" :to="collaborationId ? `/${myRole}/requests?collaboration=${collaborationId}` : `/${myRole}/requests?tab=active`" class="mt-1.5 inline-flex min-h-8 items-center gap-1 text-[0.8125rem] font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]" data-offer-collab>
      Ver colaboración <Icon name="ph:arrow-right-bold" class="size-3.5" />
    </NuxtLink>

    <div v-if="canRespond" class="mt-3 flex items-center gap-2">
      <BaseButton variant="primary" size="sm" class="flex-1" :icon-spin="responding === offer.id" :disabled="!!responding" data-offer-accept @click="respond(true)">Aceptar</BaseButton>
      <BaseButton variant="secondary" size="sm" class="flex-1" :disabled="!!responding" data-offer-decline @click="declineWithConfirm">Rechazar</BaseButton>
    </div>
    <p v-if="respondError" class="mt-2 text-[0.75rem] text-[var(--color-status-alert)]" role="alert">{{ respondError }}</p>
  </div>

  <div v-else-if="loaded" class="w-full max-w-md rounded-[var(--radius-md)] border border-dashed border-[var(--color-hairline-strong)] p-4 text-[0.8125rem] text-[var(--color-text-muted)]" data-offer-unavailable>
    <p class="inline-flex items-center gap-1.5 font-medium text-[var(--color-text)]"><Icon name="ph:package" class="size-4" /> Esta oferta ya no está disponible</p>
    <p class="mt-1">Puede que el paquete se haya borrado. El resto de la conversación no cambia.</p>
  </div>
  <SkeletonBlock v-else width="20rem" height="6rem" rounded="var(--radius-md)" />
</template>

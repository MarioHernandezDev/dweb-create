<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import type { Offer } from '~/composables/useOffers'

const props = defineProps<{ offerId: string; mine: boolean }>()

const { offersById, responding, ensureOffer, respondOffer, resolvePackageTitle } = useOffers()
const { confirm } = useConfirm()
const { myPackages } = usePackages()
const { refreshMessages, refreshConversations } = useChat()

const offer = computed<Offer | undefined>(() => offersById.value[props.offerId])
const packageTitle = ref<string | null>(null)
const respondError = ref('')

// Sin `await` a nivel de módulo: este componente puede montarse dinámicamente
// (un mensaje de oferta que llega por Realtime), sin garantía de que haya un
// <Suspense> envolviéndolo en ese momento — se carga en onMounted en vez de
// con setup() asíncrono.
onMounted(() => {
  ensureOffer(props.offerId)
})

watchEffect(async () => {
  if (!offer.value) return
  const local = myPackages.value?.find((p) => p.id === offer.value!.packageId)
  // Si no es un paquete propio, se resuelve vía resolvePackageTitle, que
  // cachea por id — varias OfferCard sobre el mismo paquete en un mismo
  // hilo solo disparan una consulta real, no una por tarjeta.
  packageTitle.value = local ? local.title : await resolvePackageTitle(offer.value.packageId)
})

const statusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'var(--color-status-review)' },
  accepted: { label: 'Aceptada', color: 'var(--color-status-published)' },
  declined: { label: 'Rechazada', color: 'var(--color-status-alert)' }
}

const canRespond = computed(() => !props.mine && offer.value?.status === 'pending')

// No basta con esperar a Realtime para ver el resultado de tu propia
// acción (el mensaje de sistema que inserta respond_offer): se refresca la
// conversación en local al momento, para que "Aceptar" se note de verdad
// aunque la suscripción en vivo tarde o, en pruebas con varias cuentas en
// la misma pestaña, no esté escuchando todavía.
async function respond(accept: boolean) {
  if (!offer.value) return
  respondError.value = ''
  try {
    const updated = await respondOffer(offer.value.id, accept)
    await Promise.all([refreshMessages(updated.conversationId), refreshConversations()])
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
  <div v-if="offer" class="w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-ink-raised)] p-4">
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <p class="text-[0.8125rem] font-medium text-[var(--color-text)] truncate">{{ packageTitle ?? 'Paquete' }}</p>
      <span class="shrink-0 text-[0.6875rem] font-medium px-2 py-0.5 rounded-full" :style="{ color: statusMeta[offer.status].color, backgroundColor: 'color-mix(in oklab, ' + statusMeta[offer.status].color + ' 15%, transparent)' }">
        {{ statusMeta[offer.status].label }}
      </span>
    </div>
    <p class="text-[1.0625rem] font-display text-[var(--color-text)] mb-1">{{ formatEuros(offer.proposedPriceCents) }}</p>
    <p v-if="offer.message" class="text-[0.8125rem] text-[var(--color-text-muted)] mb-2">{{ offer.message }}</p>

    <div v-if="canRespond" class="flex items-center gap-2 mt-2">
      <BaseButton variant="primary" size="sm" class="flex-1" :icon-spin="responding === offer.id" :disabled="!!responding" @click="respond(true)">Aceptar</BaseButton>
      <BaseButton variant="secondary" size="sm" class="flex-1" :disabled="!!responding" @click="declineWithConfirm">Rechazar</BaseButton>
    </div>
    <p v-if="respondError" class="text-[0.75rem] text-[var(--color-status-alert)] mt-2">{{ respondError }}</p>
  </div>
</template>

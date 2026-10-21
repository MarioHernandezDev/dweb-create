<script setup lang="ts">
import type { Package } from '~/composables/usePackages'

const props = defineProps<{ modelValue: boolean; pkg: Package | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; sent: [conversationId: string] }>()

const router = useRouter()
const { creating, createOffer } = useOffers()

const priceEuros = ref<number | null>(null)
const message = ref('')
const errorMsg = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    priceEuros.value = props.pkg ? props.pkg.priceCents / 100 : null
    message.value = ''
    errorMsg.value = ''
  }
)

async function send() {
  if (!props.pkg || !priceEuros.value) return
  errorMsg.value = ''
  try {
    const offer = await createOffer({
      packageId: props.pkg.id,
      proposedPriceCents: Math.round(priceEuros.value * 100),
      message: message.value || null
    })
    emit('update:modelValue', false)
    emit('sent', offer.conversationId)
    router.push(`/chat/${offer.conversationId}`)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'No se ha podido enviar la oferta.'
  }
}
</script>

<template>
  <BottomSheet :model-value="modelValue" :title="pkg ? `Ofertar: ${pkg.title}` : 'Hacer oferta'" @update:model-value="$emit('update:modelValue', $event)">
    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="offer-price">Precio propuesto (€)</label>
    <input
      id="offer-price" v-model.number="priceEuros" type="number" min="1" step="1"
      class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
    >
    <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-1.5">Puedes proponer un precio distinto al listado, para negociar.</p>

    <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5 mt-4" for="offer-message">Mensaje (opcional)</label>
    <textarea
      id="offer-message" v-model="message" rows="3" placeholder="Cuéntale el contexto de tu oferta…"
      class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
    />

    <p v-if="errorMsg" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-3">{{ errorMsg }}</p>

    <BaseButton variant="primary" size="lg" class="w-full mt-5" :icon-spin="creating" :disabled="!priceEuros || creating" @click="send">
      {{ creating ? 'Enviando…' : 'Enviar oferta' }}
    </BaseButton>
  </BottomSheet>
</template>

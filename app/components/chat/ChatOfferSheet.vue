<script setup lang="ts">
import { errorMessage } from '~/utils/error-message'
import { formatEuros } from '~/utils/mock-data'
import type { Package } from '~/composables/usePackages'

const props = defineProps<{ modelValue: boolean; packages: Package[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; sent: [conversationId: string] }>()

const route = useRoute()
const router = useRouter()
const { creating, createOffer } = useOffers()

const stage = ref<'pick' | 'form'>('pick')
const selected = ref<Package | null>(null)
const priceEuros = ref<number | null>(null)
const message = ref('')
const errorMsg = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    errorMsg.value = ''
    message.value = ''
    // Un único paquete: directo al formulario, sin hacer elegir algo obvio.
    if (props.packages.length === 1) selectPackage(props.packages[0]!)
    else {
      stage.value = 'pick'
      selected.value = null
    }
  }
)

function selectPackage(pkg: Package) {
  selected.value = pkg
  priceEuros.value = pkg.priceCents / 100
  stage.value = 'form'
}

async function send() {
  if (!selected.value || !priceEuros.value) return
  errorMsg.value = ''
  try {
    const offer = await createOffer({
      packageId: selected.value.id,
      proposedPriceCents: Math.round(priceEuros.value * 100),
      message: message.value || null
    })
    emit('update:modelValue', false)
    emit('sent', offer.conversationId)
    // Ya puedes estar viendo este mismo chat (es lo normal, el botón "+"
    // vive ahí) — solo navega si de verdad es una conversación distinta.
    if (route.path !== `/chat/${offer.conversationId}`) router.push(`/chat/${offer.conversationId}`)
  } catch (e) {
    errorMsg.value = errorMessage(e, 'No se ha podido enviar la oferta.')
  }
}
</script>

<template>
  <BottomSheet
    :model-value="modelValue" :title="stage === 'pick' ? 'Elige un paquete' : `Ofertar: ${selected?.title}`"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-if="stage === 'pick'">
      <div class="flex flex-col gap-2">
        <button
          v-for="pkg in packages" :key="pkg.id" type="button"
          class="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)] text-left hover:border-[var(--color-primary-500)]/50"
          @click="selectPackage(pkg)"
        >
          <span class="min-w-0">
            <span class="block text-base font-medium text-[var(--color-text)] truncate">{{ pkg.title }}</span>
            <span v-if="pkg.description" class="block text-sm text-[var(--color-text-muted)] truncate">{{ pkg.description }}</span>
          </span>
          <span class="shrink-0 text-base font-display text-[var(--color-text)]">{{ formatEuros(pkg.priceCents) }}</span>
        </button>
      </div>
    </template>

    <template v-else>
      <button
        v-if="packages.length > 1" type="button"
        class="text-sm text-[var(--color-text-muted)] mb-4 flex items-center gap-1 hover:text-[var(--color-text)]"
        @click="stage = 'pick'"
      >
        <Icon name="ph:arrow-left-bold" class="size-3.5" /> Elegir otro paquete
      </button>

      <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="chat-offer-price">Precio propuesto (€)</label>
      <input
        id="chat-offer-price" v-model.number="priceEuros" type="number" min="1" step="1"
        class="input w-full h-11"
      >
      <p v-if="!priceEuros" class="text-micro text-[var(--color-status-alert)] mt-1.5">Indica un precio para poder enviar la oferta.</p>
      <p v-else class="text-micro text-[var(--color-text-faint)] mt-1.5">Puedes proponer un precio distinto al listado, para negociar.</p>

      <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5 mt-4" for="chat-offer-message">Mensaje (opcional)</label>
      <textarea
        id="chat-offer-message" v-model="message" rows="3" maxlength="500" placeholder="Cuéntale el contexto de tu oferta…"
        class="textarea w-full resize-none"
      />

      <p v-if="errorMsg" class="text-sm text-[var(--color-status-alert)] mt-3">{{ errorMsg }}</p>

      <BaseButton variant="primary" size="lg" class="w-full mt-5" :icon-spin="creating" :disabled="!priceEuros || creating" @click="send">
        {{ creating ? 'Enviando…' : 'Enviar oferta' }}
      </BaseButton>
    </template>
  </BottomSheet>
</template>

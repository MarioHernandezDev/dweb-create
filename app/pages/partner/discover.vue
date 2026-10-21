<script setup lang="ts">
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import type { DiscoveryResult } from '~/composables/useDiscover'

useHead({ title: 'Descubrir' })

const client = useSupabaseClient()
const { partner } = useMyPartner()
const { results, loading, searched, error, search } = useDiscover()

const mode = ref<'filters' | 'ai'>('filters')
const modeOptions = [{ value: 'filters', label: 'Filtros' }, { value: 'ai', label: 'Buscar con IA' }]
const queryText = ref('')
const selectedCategories = ref<string[]>([])
const minBudgetEuros = ref<number | null>(null)
const maxBudgetEuros = ref<number | null>(null)
const filtersOpen = ref(false)

function toggleCategory(cat: string) {
  const i = selectedCategories.value.indexOf(cat)
  if (i === -1) selectedCategories.value.push(cat)
  else selectedCategories.value.splice(i, 1)
}

async function runSearch() {
  await search(mode.value, queryText.value, {
    categories: selectedCategories.value,
    minBudgetCents: minBudgetEuros.value ? Math.round(minBudgetEuros.value * 100) : null,
    maxBudgetCents: maxBudgetEuros.value ? Math.round(maxBudgetEuros.value * 100) : null
  })
}

// Carga inicial con los filtros vacíos, igual que antes mostraba el
// directorio entero sin tener que pulsar nada.
await runSearch()

const sheetOpen = ref(false)
const sheetStage = ref<'form' | 'sent'>('form')
const target = ref<DiscoveryResult | null>(null)
const message = ref('')
const budgetEuros = ref<number | null>(null)
const sending = ref(false)

function openContact(creator: DiscoveryResult) {
  target.value = creator
  sheetStage.value = 'form'
  message.value = ''
  budgetEuros.value = null
  sheetOpen.value = true
}

async function send() {
  if (!target.value || !message.value || !budgetEuros.value) return
  const me = partner.value
  if (!me) return

  sending.value = true
  const { error: insertError } = await client.from('collaborations').insert({
    partner_id: me.id,
    creator_id: target.value.id,
    initiated_by: 'partner',
    brief: message.value,
    budget_cents: Math.round(budgetEuros.value * 100)
  } as never)
  sending.value = false

  if (insertError) {
    console.error('[discover] fallo al enviar la solicitud:', insertError.message)
    return
  }
  sheetStage.value = 'sent'
}
</script>

<template>
  <AppShell role="partner" title="Descubrir" subtitle="Contacta directo con un creador de contenido" full-width>
    <section class="mb-6 max-w-[1100px]">
      <div class="flex items-center gap-2.5 mb-3.5">
        <SegmentedTabs v-model="mode" :options="modeOptions" />
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium border border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          @click="filtersOpen = !filtersOpen"
        >
          <Icon name="ph:sliders-horizontal-bold" class="size-4" />
          Filtros
          <span v-if="selectedCategories.length || minBudgetEuros || maxBudgetEuros" class="size-1.5 rounded-full bg-[var(--color-primary-500)]" />
        </button>
      </div>

      <div v-if="mode === 'ai'" class="mb-3.5">
        <textarea
          v-model="queryText" rows="2"
          placeholder="Ej. «busco un creador de moda sostenible, presupuesto 300-500€, tono joven»…"
          class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
        />
      </div>

      <div v-if="filtersOpen" class="mb-3.5 p-3.5 rounded-[var(--radius-md)] bg-[var(--color-ink-overlay)]/60 border border-[var(--color-hairline)]">
        <div class="flex flex-wrap gap-1.5 mb-3">
          <button
            v-for="cat in DISCOVERY_CATEGORIES" :key="cat" type="button"
            class="px-3 h-8 rounded-full text-[0.8125rem] font-medium border transition-colors duration-150"
            :class="selectedCategories.includes(cat)
              ? 'bg-[var(--color-primary-500)]/15 border-[var(--color-primary-500)]/50 text-[var(--color-primary-500)]'
              : 'bg-[var(--color-ink-raised)] border-[var(--color-hairline)] text-[var(--color-text-muted)]'"
            @click="toggleCategory(cat)"
          >
            {{ cat }}
          </button>
        </div>

        <div class="flex items-center gap-2.5">
          <input
            v-model.number="minBudgetEuros" type="number" min="0" step="1" placeholder="Presupuesto desde (€)"
            class="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
          >
          <input
            v-model.number="maxBudgetEuros" type="number" min="0" step="1" placeholder="hasta (€)"
            class="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
          >
        </div>
      </div>

      <BaseButton
        variant="primary" size="md" :icon-spin="loading" :disabled="loading"
        :icon="mode === 'ai' ? 'ph:sparkle-fill' : 'ph:magnifying-glass-bold'" @click="runSearch"
      >
        {{ loading ? 'Buscando…' : mode === 'ai' ? 'Buscar con IA' : 'Buscar' }}
      </BaseButton>
      <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-2">{{ error }}</p>
    </section>

    <EmptyState
      v-if="searched && !results.length"
      icon="ph:user-circle" title="Ningún creador encaja con esta búsqueda"
      description="Prueba a quitar algún filtro o a reformular tu búsqueda."
    />
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <DiscoveryCard
        v-for="creator in results" :key="creator.id" :result="creator" kind="creator" cta-label="Contactar"
        @contact="openContact(creator)"
      />
    </div>

    <BottomSheet v-model="sheetOpen" :title="target ? `Contactar a ${target.name}` : 'Contactar'">
      <template v-if="sheetStage === 'form'">
        <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="brief">Cuéntales tu campaña</label>
        <textarea
          id="brief" v-model="message" rows="4" placeholder="Qué necesitas y para cuándo…"
          class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
        />

        <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5 mt-4" for="budget">Presupuesto (€)</label>
        <input
          id="budget" v-model.number="budgetEuros" type="number" min="1" step="1" placeholder="Ej. 300"
          class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
        >
        <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-1.5">Lo pagas desde FEEDMA cuando acordéis los detalles — el dinero llega directo, descontando la comisión de la plataforma.</p>

        <BaseButton
          variant="primary" size="lg" class="w-full mt-4" :icon-spin="sending" :disabled="!message || !budgetEuros || sending"
          @click="send"
        >
          {{ sending ? 'Enviando…' : 'Enviar solicitud' }}
        </BaseButton>
      </template>
      <template v-else>
        <div class="flex flex-col items-center text-center gap-3 py-4">
          <span class="flex items-center justify-center size-12 rounded-full bg-[var(--color-status-published)]/15 text-[var(--color-status-published)]">
            <Icon name="ph:paper-plane-tilt-fill" class="size-5" />
          </span>
          <p class="text-[0.9375rem] text-[var(--color-text)]">Solicitud enviada a {{ target?.name }}</p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)]">Te avisamos en cuanto responda.</p>
        </div>
      </template>
    </BottomSheet>
  </AppShell>
</template>

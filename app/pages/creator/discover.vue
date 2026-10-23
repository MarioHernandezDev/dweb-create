<script setup lang="ts">
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import type { DiscoveryResult } from '~/composables/useDiscover'

useHead({ title: 'Descubrir' })

const client = useSupabaseClient()
const { creator } = useMyCreator()
const { results, loading, searched, error, aiLoading, aiSummary, aiCategories, search } = useDiscover()

const mode = ref<'filters' | 'ai'>('filters')
const modeOptions = [{ value: 'filters', label: 'Filtros' }, { value: 'ai', label: 'Buscar con IA' }]
const queryText = ref('')
const selectedCategories = ref<string[]>([])
const minBudgetEuros = ref<number | null>(null)
const maxBudgetEuros = ref<number | null>(null)
const filtersOpen = ref(false)

// Destacados es el diseño general de la sección, con o sin IA de por medio
// — se ve en cuanto hay resultados. Lo único que cambia con el modo es qué
// hay de verdad detrás de cada card: con IA, puntuación y motivo reales;
// sin ella, el propio orden por filtros (más alto = más categorías en
// común) y la bio en vez de un "motivo" inventado.
const showDeck = computed(() => results.value.length > 0)
// El 50% heurístico por defecto (sin filtros de categoría ni IA) es el
// mismo para todo el mundo — mostrarlo sería un número sin significado
// real, así que el badge de puntuación solo aparece cuando hay un criterio
// de verdad detrás.
const scoreMeaningful = computed(() => selectedCategories.value.length > 0 || results.value.some((r) => r.reason))
// Ids visibles ahora mismo en la tira de Destacados — la lista de debajo
// los excluye, así nada se repite entre las dos zonas.
const deckVisibleIds = ref<string[]>([])
const listResults = computed(() => (showDeck.value ? results.value.filter((r) => !deckVisibleIds.value.includes(r.id)) : results.value))

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

await runSearch()

const sheetOpen = ref(false)
const sheetStage = ref<'form' | 'sent'>('form')
const target = ref<DiscoveryResult | null>(null)
const message = ref('')
const rateEuros = ref<number | null>(null)
const sending = ref(false)

function openContact(partnerResult: DiscoveryResult) {
  target.value = partnerResult
  sheetStage.value = 'form'
  message.value = ''
  rateEuros.value = null
  sheetOpen.value = true
}

async function send() {
  if (!target.value || !message.value || !rateEuros.value) return
  const me = creator.value
  if (!me) return

  sending.value = true
  const { error: insertError } = await client.from('collaborations').insert({
    partner_id: target.value.id,
    creator_id: me.id,
    initiated_by: 'creator',
    brief: message.value,
    budget_cents: Math.round(rateEuros.value * 100)
  } as never)
  sending.value = false

  if (insertError) {
    console.error('[discover] fallo al enviar la propuesta:', insertError.message)
    return
  }
  sheetStage.value = 'sent'
}
</script>

<template>
  <AppShell role="creator" title="Descubrir" subtitle="Encuentra marcas interesadas en tu contenido" full-width>
    <section class="mb-6 max-w-[1100px]">
      <div class="flex items-center gap-2.5 mb-3.5">
        <SegmentedTabs v-model="mode" :options="modeOptions" />
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium border border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-ink-overlay)] transition-colors"
          @click="filtersOpen = !filtersOpen"
        >
          <Icon name="ph:sliders-horizontal-bold" class="size-4" />
          Filtros
          <span v-if="selectedCategories.length || minBudgetEuros || maxBudgetEuros" class="size-1.5 rounded-full bg-[var(--color-primary-500)]" />
        </button>
        <NuxtLink
          to="/favorites"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium border border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-ink-overlay)] transition-colors"
        >
          <Icon name="ph:bookmark-simple-fill" class="size-4" />
          Guardados
        </NuxtLink>
      </div>

      <div v-if="mode === 'ai'" class="mb-3.5">
        <textarea
          v-model="queryText" rows="2"
          placeholder="Ej. «busco marcas de fitness o nutrición, con al menos 300€ por pack de contenido»…"
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
              : 'bg-[var(--color-ink-raised)] border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:border-[var(--color-primary-500)]/40 hover:text-[var(--color-primary-600)]'"
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
      icon="ph:storefront" title="Ningún partner encaja con esta búsqueda"
      description="Prueba a quitar algún filtro o a reformular tu búsqueda."
    />
    <template v-else>
      <FeaturedDeck
        v-if="showDeck"
        :results="results" :loading="aiLoading" :summary="aiSummary" :categories="aiCategories" :score-meaningful="scoreMeaningful"
        kind="partner" cta-label="Proponer"
        @contact="openContact" @visible-change="deckVisibleIds = $event"
      />
      <div class="flex flex-col gap-3 max-w-[760px]">
        <DiscoveryCard
          v-for="partnerResult in listResults" :key="partnerResult.id" :result="partnerResult" kind="partner" cta-label="Proponer"
          @contact="openContact(partnerResult)"
        />
      </div>
    </template>

    <BottomSheet v-model="sheetOpen" :title="target ? `Proponer a ${target.name}` : 'Proponer colaboración'">
      <template v-if="sheetStage === 'form'">
        <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="brief">Cuéntales qué les ofreces</label>
        <textarea
          id="brief" v-model="message" rows="4" placeholder="Qué puedes hacer por ellos y en qué formato…"
          class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
        />

        <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5 mt-4" for="rate">Tu tarifa (€)</label>
        <input
          id="rate" v-model.number="rateEuros" type="number" min="1" step="1" placeholder="Ej. 300"
          class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
        >
        <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-1.5">Si acepta, cobras desde FEEDMA — el dinero llega directo, descontando la comisión de la plataforma.</p>

        <BaseButton
          variant="primary" size="lg" class="w-full mt-4" :icon-spin="sending" :disabled="!message || !rateEuros || sending"
          @click="send"
        >
          {{ sending ? 'Enviando…' : 'Enviar propuesta' }}
        </BaseButton>
      </template>
      <template v-else>
        <div class="flex flex-col items-center text-center gap-3 py-4">
          <span class="flex items-center justify-center size-12 rounded-full bg-[var(--color-status-published)]/15 text-[var(--color-status-published)]">
            <Icon name="ph:paper-plane-tilt-fill" class="size-5" />
          </span>
          <p class="text-[0.9375rem] text-[var(--color-text)]">Propuesta enviada a {{ target?.name }}</p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)]">Te avisamos en cuanto responda.</p>
        </div>
      </template>
    </BottomSheet>
  </AppShell>
</template>

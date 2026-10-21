<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { localPhotos } from '~/utils/images'
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import type { DiscoveryResult } from '~/composables/useDiscover'

useHead({ title: 'Descubrir' })

const banner = localPhotos.discover

const client = useSupabaseClient()
const { creator } = useMyCreator()
const { results, loading, searched, error, search } = useDiscover()

const mode = ref<'filters' | 'ai'>('filters')
const modeOptions = [{ value: 'filters', label: 'Filtros' }, { value: 'ai', label: 'Buscar con IA' }]
const queryText = ref('')
const selectedCategories = ref<string[]>([])
const minBudgetEuros = ref<number | null>(null)
const maxBudgetEuros = ref<number | null>(null)

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
  <AppShell role="creator" title="Descubrir" subtitle="Encuentra marcas interesadas en tu contenido">
    <div class="relative h-36 md:h-48 rounded-[var(--radius-lg)] overflow-hidden mb-7">
      <CoverImage :photo="banner" :width="900" :height="400" scrim="bottom" class="absolute inset-0" />
      <div class="relative h-full flex flex-col justify-end p-5">
        <p class="font-display text-white text-[1.375rem] leading-snug max-w-[26ch]">Encuentra tu próxima marca</p>
      </div>
    </div>

    <section class="mb-6">
      <SegmentedTabs v-model="mode" :options="modeOptions" class="mb-3.5" />

      <div v-if="mode === 'ai'" class="mb-3.5">
        <textarea
          v-model="queryText" rows="2"
          placeholder="Ej. «busco marcas de fitness o nutrición, con al menos 300€ por pack de contenido»…"
          class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
        />
      </div>

      <div class="flex flex-wrap gap-1.5 mb-3.5">
        <button
          v-for="cat in DISCOVERY_CATEGORIES" :key="cat" type="button"
          class="px-3 h-8 rounded-full text-[0.8125rem] font-medium border transition-colors duration-150"
          :class="selectedCategories.includes(cat)
            ? 'bg-[var(--color-primary-500)]/15 border-[var(--color-primary-500)]/50 text-[var(--color-primary-500)]'
            : 'bg-[var(--color-ink-overlay)] border-[var(--color-hairline)] text-[var(--color-text-muted)]'"
          @click="toggleCategory(cat)"
        >
          {{ cat }}
        </button>
      </div>

      <div class="flex items-center gap-2.5 mb-3.5">
        <input
          v-model.number="minBudgetEuros" type="number" min="0" step="1" placeholder="Presupuesto desde (€)"
          class="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
        >
        <input
          v-model.number="maxBudgetEuros" type="number" min="0" step="1" placeholder="hasta (€)"
          class="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
        >
      </div>

      <BaseButton
        variant="primary" size="md" class="w-full" :icon-spin="loading" :disabled="loading"
        :icon="mode === 'ai' ? 'ph:sparkle-fill' : 'ph:magnifying-glass-bold'" @click="runSearch"
      >
        {{ loading ? 'Buscando…' : mode === 'ai' ? 'Buscar con IA' : 'Buscar' }}
      </BaseButton>
      <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-2">{{ error }}</p>
    </section>

    <section>
      <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-1">Partners</h2>
      <p class="text-[0.8125rem] text-[var(--color-text-muted)] mb-3.5">Propón una colaboración a la marca que te interese.</p>
      <EmptyState
        v-if="searched && !results.length"
        icon="ph:storefront" title="Ningún partner encaja con esta búsqueda"
        description="Prueba a quitar algún filtro o a reformular tu búsqueda."
      />
      <div v-else class="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
        <BaseCard v-for="partnerResult in results" :key="partnerResult.id" radius="md" padding="md">
          <div class="flex items-center gap-4">
            <BaseAvatar :initials="initialsFromName(partnerResult.name)" :hue="hueFromString(partnerResult.name)" />
            <div class="min-w-0 flex-1">
              <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ partnerResult.name }}</p>
              <p class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">
                {{ partnerResult.categories.join(', ') || 'Sin especificar' }}
              </p>
              <p v-if="partnerResult.minCents || partnerResult.maxCents" class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">
                Presupuesto orientativo: {{ partnerResult.minCents ? formatEuros(partnerResult.minCents) : '…' }}–{{ partnerResult.maxCents ? formatEuros(partnerResult.maxCents) : '…' }}
              </p>
            </div>
            <BaseButton variant="secondary" size="sm" class="shrink-0" @click="openContact(partnerResult)">Proponer</BaseButton>
          </div>
          <p v-if="partnerResult.reason" class="mt-3 pt-3 border-t border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-primary-500)] flex items-start gap-1.5">
            <Icon name="ph:sparkle-fill" class="size-4 shrink-0 mt-0.5" /> {{ partnerResult.reason }}
          </p>
        </BaseCard>
      </div>
    </section>

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

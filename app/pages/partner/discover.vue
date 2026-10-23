<script setup lang="ts">
import { DISCOVERY_CATEGORIES } from '~/utils/categories'
import { formatEuros } from '~/utils/mock-data'
import type { DiscoveryResult } from '~/composables/useDiscover'

useHead({ title: 'Descubrir' })

const client = useSupabaseClient()
const { partner } = useMyPartner()
const { results, loading, searched, error, aiLoading, aiSummary, aiCategories, search, cancelAi } = useDiscover()
const { savedCreatorIds, ensureIdsLoaded: ensureSavedLoaded } = useSavedProfiles()
ensureSavedLoaded()

// Hallazgo #7: "Contactar" no avisaba de una solicitud ya enviada a ese
// mismo creador. `collaborations` ya se usa en /partner/requests — aquí
// solo se necesita saber a quién ya se le ha escrito y sigue sin responder.
const { collaborations: myCollaborations, ensureLoaded: ensureCollaborationsLoaded } = useMyCollaborations()
const pendingCreatorIds = computed(() => myCollaborations.value.filter((c) => c.status === 'requested').map((c) => c.creatorId))

const mode = ref<'filters' | 'ai'>('filters')
const queryText = ref('')
const selectedCategories = ref<string[]>([])
const minBudgetEuros = ref<number | null>(null)
const maxBudgetEuros = ref<number | null>(null)
const filtersOpen = ref(false)
const hasActiveFilters = computed(() => selectedCategories.value.length > 0 || minBudgetEuros.value !== null || maxBudgetEuros.value !== null)

// Destacados es el diseño general de la sección, con o sin IA de por medio
// — se ve en cuanto hay resultados. Lo único que cambia con el modo es qué
// hay de verdad detrás de cada card: con IA, puntuación y motivo reales;
// sin ella, el propio orden por filtros (más alto = más categorías en
// común) y la bio en vez de un "motivo" inventado.
const showDeck = computed(() => results.value.length > 0)
// `loading` solo cubre la fase rápida de filtros (siempre BD) — mientras
// la IA sigue pensando (`aiLoading`), antes el botón volvía a su aspecto
// normal como si ya hubiera terminado. Esto es lo que de verdad decide su
// aspecto "ocupado" en el botón de abajo.
const searching = computed(() => loading.value || aiLoading.value)
// Pedido explícito del usuario: el botón de buscar solo se enseña si hay
// algo que de verdad buscar — un filtro puesto, o el modo IA activo (ahí
// se deja ver siempre, pero se desactiva hasta que se escriba algo).
const showSearchButton = computed(() => hasActiveFilters.value || mode.value === 'ai')
const searchDisabled = computed(() => searching.value || (mode.value === 'ai' && !queryText.value.trim()))
// El 50% heurístico por defecto (sin filtros de categoría ni IA) es el
// mismo para todo el mundo — mostrarlo sería un número sin significado
// real, así que el badge de puntuación y el título "para ti" solo aparecen
// cuando hay un criterio de verdad detrás (ver FeaturedDeck.vue).
const scoreMeaningful = computed(() => selectedCategories.value.length > 0 || results.value.some((r) => r.reason))
// Ids visibles ahora mismo en la tira de Destacados — la lista de debajo
// los excluye, así nada se repite entre las dos zonas.
const deckVisibleIds = ref<string[]>([])
const listResults = computed(() => (showDeck.value ? results.value.filter((r) => !deckVisibleIds.value.includes(r.id)) : results.value))

// Revelación progresiva EN CLIENTE sobre el array ya recibido — el backend
// no tiene paginación de verdad (limita a 200 candidatos de golpe), así que
// no se pinta todo a la vez igualmente: se enseñan de 12 en 12.
const PAGE_SIZE = 12
const visibleCount = ref(PAGE_SIZE)
const visibleResults = computed(() => listResults.value.slice(0, visibleCount.value))
const hasMore = computed(() => listResults.value.length > visibleCount.value)

function toggleCategory(cat: string) {
  const i = selectedCategories.value.indexOf(cat)
  if (i === -1) selectedCategories.value.push(cat)
  else selectedCategories.value.splice(i, 1)
}

async function runSearch() {
  visibleCount.value = PAGE_SIZE
  await search(mode.value, queryText.value, {
    categories: selectedCategories.value,
    minBudgetCents: minBudgetEuros.value ? Math.round(minBudgetEuros.value * 100) : null,
    maxBudgetCents: maxBudgetEuros.value ? Math.round(maxBudgetEuros.value * 100) : null
  })
}

// Quitar un filtro activo relanza la búsqueda de inmediato (un clic
// deliberado, no una tecla más mientras se escribe) — la guarda de
// "petición más reciente gana" en useDiscover() evita que una respuesta
// vieja pise esta si el usuario encadena varios quitados rápido.
function removeCategory(cat: string) {
  toggleCategory(cat)
  runSearch()
}
function clearBudget() {
  minBudgetEuros.value = null
  maxBudgetEuros.value = null
  runSearch()
}
function clearAllFilters() {
  selectedCategories.value = []
  minBudgetEuros.value = null
  maxBudgetEuros.value = null
  runSearch()
}

// Carga inicial con los filtros vacíos, igual que antes mostraba el
// directorio entero sin tener que pulsar nada.
await Promise.all([runSearch(), ensureCollaborationsLoaded()])

const sheetOpen = ref(false)
const sheetStage = ref<'form' | 'sent'>('form')
const target = ref<DiscoveryResult | null>(null)
const message = ref('')
const budgetEuros = ref<number | null>(null)
const sending = ref(false)

// "Detalles de la propuesta (opcional)" — ver supabase/migrations/
// 20261025150000_collaboration_terms.sql y 20261025180000_collaboration_
// brief_fields.sql. Se fijan aquí, al enviar, y quedan congeladas para
// siempre (un trigger lo garantiza en la base de datos) — no hay edición
// posterior. Colapsado por defecto: no es obligatorio rellenarlo.
const termsOpen = ref(false)
const campaignGoal = ref('')
const targetAudience = ref('')
const tone = ref('')
const scopeNotes = ref('')
const revisionsIncluded = ref<number | null>(null)
const exclusivity = ref(false)
const usageRights = ref('')

function openContact(creator: DiscoveryResult) {
  target.value = creator
  sheetStage.value = 'form'
  message.value = ''
  budgetEuros.value = null
  termsOpen.value = false
  campaignGoal.value = ''
  targetAudience.value = ''
  tone.value = ''
  scopeNotes.value = ''
  revisionsIncluded.value = null
  exclusivity.value = false
  usageRights.value = ''
  sheetOpen.value = true
}

async function send() {
  if (!target.value || !message.value || !budgetEuros.value || sending.value) return
  const me = partner.value
  if (!me) return

  sending.value = true
  const { error: insertError } = await client.from('collaborations').insert({
    partner_id: me.id,
    creator_id: target.value.id,
    initiated_by: 'partner',
    brief: message.value,
    budget_cents: Math.round(budgetEuros.value * 100),
    campaign_goal: campaignGoal.value.trim() || null,
    target_audience: targetAudience.value.trim() || null,
    tone: tone.value.trim() || null,
    scope_notes: scopeNotes.value.trim() || null,
    revisions_included: revisionsIncluded.value,
    exclusivity: exclusivity.value,
    usage_rights: usageRights.value.trim() || null
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
    <section class="mb-6 max-w-[640px]">
      <div class="flex items-center gap-2.5 mb-3.5">
        <!-- Antes había dos botones que decían "Filtros": esta pestaña (el
             selector de modo) y el de abajo (el que de verdad abre el panel
             de filtros). Pedido explícito: se queda solo uno de "Buscar con
             IA", como un interruptor, no como una pestaña enfrentada a otra
             que no hacía nada por sí misma. -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium border transition-colors"
          :class="mode === 'ai'
            ? 'border-[var(--color-primary-500)]/50 bg-[var(--color-primary-500)]/12 text-[var(--color-primary-600)]'
            : 'border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-ink-overlay)]'"
          @click="mode = mode === 'ai' ? 'filters' : 'ai'"
        >
          <Icon name="ph:sparkle-fill" class="size-4" />
          Buscar con IA
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium border border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-ink-overlay)] transition-colors"
          @click="filtersOpen = !filtersOpen"
        >
          <Icon name="ph:sliders-horizontal-bold" class="size-4" />
          Filtros
          <span v-if="hasActiveFilters" class="size-1.5 rounded-full bg-[var(--color-primary-500)]" />
        </button>
        <NuxtLink
          to="/favorites"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium border border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-ink-overlay)] transition-colors"
        >
          <Icon name="ph:bookmark-simple-fill" class="size-4" />
          Guardados
          <span v-if="savedCreatorIds.size" class="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[var(--color-primary-500)]/15 text-[var(--color-primary-600)] text-[0.6875rem] font-semibold leading-[1.125rem] text-center">{{ savedCreatorIds.size }}</span>
        </NuxtLink>
      </div>

      <!-- Filtros activos: visibles aunque el panel esté cerrado, cada uno quitable por separado. -->
      <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-1.5 mb-3.5">
        <button
          v-for="cat in selectedCategories" :key="cat" type="button"
          class="inline-flex items-center gap-1 pl-2.5 pr-1.5 h-7 rounded-full text-[0.75rem] font-medium bg-[var(--color-primary-500)]/12 text-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)]/20"
          @click="removeCategory(cat)"
        >
          {{ cat }} <Icon name="ph:x-bold" class="size-3" />
        </button>
        <button
          v-if="minBudgetEuros !== null || maxBudgetEuros !== null" type="button"
          class="inline-flex items-center gap-1 pl-2.5 pr-1.5 h-7 rounded-full text-[0.75rem] font-medium bg-[var(--color-primary-500)]/12 text-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)]/20"
          @click="clearBudget"
        >
          {{ minBudgetEuros ? formatEuros(minBudgetEuros * 100) : '…' }}–{{ maxBudgetEuros ? formatEuros(maxBudgetEuros * 100) : '…' }} <Icon name="ph:x-bold" class="size-3" />
        </button>
        <button type="button" class="text-[0.75rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2" @click="clearAllFilters">
          Limpiar filtros
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
        v-if="showSearchButton"
        :variant="searching ? 'secondary' : 'primary'" size="md" :icon-spin="searching" :disabled="searchDisabled"
        :icon="mode === 'ai' ? 'ph:sparkle-fill' : 'ph:magnifying-glass-bold'" @click="runSearch"
      >
        {{ searching ? 'Buscando…' : mode === 'ai' ? 'Buscar con IA' : 'Buscar' }}
      </BaseButton>
      <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-2">{{ error }}</p>
    </section>

    <EmptyState
      v-if="searched && !results.length"
      icon="ph:user-circle" title="Ningún creador encaja con esta búsqueda"
      description="Prueba a quitar algún filtro o a reformular tu búsqueda."
    />
    <template v-else>
      <!-- Hallazgo #6: antes no había ningún recuento visible de resultados. -->
      <p v-if="searched" class="text-[0.8125rem] text-[var(--color-text-muted)] mb-3">
        {{ results.length }} {{ results.length === 1 ? 'creador encontrado' : 'creadores encontrados' }}
      </p>
      <FeaturedDeck
        v-if="showDeck"
        :results="results" :loading="aiLoading" :summary="aiSummary" :categories="aiCategories" :score-meaningful="scoreMeaningful"
        kind="creator" cta-label="Contactar" :pending-ids="pendingCreatorIds"
        @contact="openContact" @visible-change="deckVisibleIds = $event" @cancel="cancelAi"
      />
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        <DiscoveryCard
          v-for="creator in visibleResults" :key="creator.id" :result="creator" kind="creator" cta-label="Contactar"
          :is-pending="pendingCreatorIds.includes(creator.id)"
          @contact="openContact(creator)"
        />
      </div>
      <div v-if="hasMore" class="flex justify-center mt-5">
        <BaseButton variant="secondary" size="md" @click="visibleCount += PAGE_SIZE">Cargar más</BaseButton>
      </div>
    </template>

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

        <button
          type="button"
          class="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] mt-4"
          @click="termsOpen = !termsOpen"
        >
          <Icon :name="termsOpen ? 'ph:caret-down-bold' : 'ph:caret-right-bold'" class="size-3.5" />
          Detalles de la propuesta (opcional)
        </button>
        <div v-if="termsOpen" class="flex flex-col gap-3 mt-3 p-3.5 rounded-[var(--radius-md)] bg-[var(--color-ink-overlay)]/60 border border-[var(--color-hairline)]">
          <p class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Sobre la campaña</p>
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="campaign-goal">Objetivo</label>
            <textarea
              id="campaign-goal" v-model="campaignGoal" rows="2" placeholder="Qué buscáis conseguir con esta colaboración…"
              class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
            />
          </div>
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="target-audience">Público objetivo</label>
            <input
              id="target-audience" v-model="targetAudience" type="text" placeholder="Ej. mujeres 25-35, moda sostenible"
              class="w-full h-10 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
            >
          </div>
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="tone">Tono</label>
            <input
              id="tone" v-model="tone" type="text" placeholder="Ej. cercano y divertido"
              class="w-full h-10 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
            >
          </div>

          <p class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mt-2">Condiciones</p>
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="scope-notes">Alcance (entregables concretos)</label>
            <textarea
              id="scope-notes" v-model="scopeNotes" rows="2" placeholder="Ej. 1 reel + 2 stories"
              class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
            />
          </div>
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="revisions">Revisiones incluidas</label>
            <input
              id="revisions" v-model.number="revisionsIncluded" type="number" min="0" step="1" placeholder="Déjalo en blanco si no hay límite"
              class="w-full h-10 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
            >
          </div>
          <label class="flex items-center gap-2 text-[0.8125rem] text-[var(--color-text)]">
            <input v-model="exclusivity" type="checkbox" class="size-4 accent-[var(--color-primary-500)]">
            Exclusividad (no trabajará con la competencia mientras dure)
          </label>
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="usage-rights">Derechos de uso del contenido</label>
            <textarea
              id="usage-rights" v-model="usageRights" rows="2" placeholder="Ej. uso en redes propias durante 6 meses"
              class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
            />
          </div>
          <p class="text-[0.75rem] text-[var(--color-text-faint)]">Quedan fijadas tal cual al enviar — no se pueden editar después.</p>
        </div>

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

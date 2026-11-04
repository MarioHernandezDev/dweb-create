<script setup lang="ts">
import { useDebounceFn, useIntersectionObserver } from '@vueuse/core'
import { formatEuros } from '~/utils/mock-data'
import type { DiscoveryResult } from '~/composables/useDiscover'

/**
 * Exploración de Descubrir, igual para los dos roles: `kind` es lo que se
 * lista (`partner` para un creador, `creator` para un partner). La página
 * solo aporta el texto y lo que pasa al contactar.
 *
 * Pensada para ser cómoda y rápida:
 *  - los filtros se aplican solos (con una pausa de 0,4 s), sin botón «Buscar»;
 *  - la búsqueda por nombre filtra en el cliente, al instante;
 *  - «Con IA» sí tiene botón explícito (cuesta una llamada al modelo);
 *  - recomendados arriba solo si hay un criterio de verdad (categorías o IA);
 *  - la rejilla se pinta de 12 en 12 con carga automática al llegar al final,
 *    y las fotos cargan optimizadas y diferidas (ver SmartImage.vue).
 */
const props = defineProps<{
  kind: 'creator' | 'partner'
  /** Texto del botón de cada tarjeta («Proponer», «Contactar»). */
  ctaLabel: string
  /** Ids con una solicitud sin responder (la tarjeta lo avisa y no deja enviar otra). */
  pendingIds: string[]
}>()
const emit = defineEmits<{ contact: [result: DiscoveryResult] }>()

const noun = computed(() => (props.kind === 'partner'
  ? { one: 'marca', many: 'marcas', none: 'Ninguna marca encaja con esta búsqueda' }
  : { one: 'creador', many: 'creadores', none: 'Ningún creador encaja con esta búsqueda' }))

const { results, loading, searched, error, aiLoading, aiSummary, aiCategories, search, cancelAi } = useDiscover()
const { savedPartnerIds, savedCreatorIds, ensureIdsLoaded } = useSavedProfiles()
ensureIdsLoaded()
const savedCount = computed(() => (props.kind === 'partner' ? savedPartnerIds.value.size : savedCreatorIds.value.size))

const mode = ref<'explore' | 'ai'>('explore')
const queryText = ref('')
const nameQuery = ref('')
const selectedCategories = ref<string[]>([])
const minEuros = ref<number | null>(null)
const maxEuros = ref<number | null>(null)
const filtersOpen = ref(false)

// Un campo numérico vacío llega como '' (no null).
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const hasActiveFilters = computed(() => selectedCategories.value.length > 0 || num(minEuros.value) !== null || num(maxEuros.value) !== null)
const activeCount = computed(() => selectedCategories.value.length + (num(minEuros.value) !== null || num(maxEuros.value) !== null ? 1 : 0))

const PAGE_SIZE = 12
const visibleCount = ref(PAGE_SIZE)

async function runSearch() {
  visibleCount.value = PAGE_SIZE
  const min = num(minEuros.value)
  const max = num(maxEuros.value)
  await search(mode.value === 'ai' ? 'ai' : 'filters', queryText.value, {
    categories: selectedCategories.value,
    minBudgetCents: min ? Math.round(min * 100) : null,
    maxBudgetCents: max ? Math.round(max * 100) : null
  })
}

// Los filtros se aplican solos. Con IA, solo al pulsar el botón.
const applyFilters = useDebounceFn(() => { if (mode.value === 'explore') runSearch() }, 400)
watch([selectedCategories, minEuros, maxEuros], () => applyFilters(), { deep: true })
watch(mode, (m) => { if (m === 'explore' && searched.value) runSearch() })

function clearFilters() {
  selectedCategories.value = []
  minEuros.value = null
  maxEuros.value = null
}
function removeCategory(cat: string) { selectedCategories.value = selectedCategories.value.filter((c) => c !== cat) }
function clearBudget() { minEuros.value = null; maxEuros.value = null }

// Carga inicial (también en el servidor): el directorio entero, sin pulsar nada.
await runSearch()

// ---- Lo que se ve --------------------------------------------------------
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const filtered = computed(() => {
  const q = norm(nameQuery.value.trim())
  return q ? results.value.filter((r) => norm(r.name).includes(q)) : results.value
})
const scoreMeaningful = computed(() => selectedCategories.value.length > 0 || results.value.some((r) => r.reason))
// Recomendados: los 3 primeros, solo con criterio y sin búsqueda por nombre.
const featured = computed(() => (scoreMeaningful.value && !nameQuery.value.trim() ? filtered.value.slice(0, 3) : []))
const rest = computed(() => filtered.value.slice(featured.value.length))
const visibleRest = computed(() => rest.value.slice(0, visibleCount.value))
const hasMore = computed(() => rest.value.length > visibleCount.value)
const showSkeleton = computed(() => loading.value && !results.value.length)

// Carga automática al llegar al final de la rejilla.
const sentinel = ref<HTMLElement | null>(null)
useIntersectionObserver(sentinel, ([entry]) => { if (entry?.isIntersecting && hasMore.value) visibleCount.value += PAGE_SIZE }, { rootMargin: '600px' })
</script>

<template>
  <div class="discover">
    <!-- Barra de búsqueda -->
    <div class="discover__bar">
      <SegmentedTabs
        :options="[{ value: 'explore', label: 'Explorar' }, { value: 'ai', label: 'Con IA' }]" :model-value="mode"
        label="Modo de búsqueda" @update:model-value="mode = $event as 'explore' | 'ai'"
      />

      <div v-if="mode === 'explore'" class="discover__search">
        <BaseField :label="`Buscar ${noun.one} por nombre`" v-slot="f" class="discover__field">
          <BaseInput v-bind="f" v-model="nameQuery" icon="ph:magnifying-glass-bold" :placeholder="`Buscar ${noun.one} por nombre…`" autocomplete="off" />
        </BaseField>
      </div>
      <form v-else class="discover__search discover__search--ai" @submit.prevent="runSearch">
        <BaseField label="Describe lo que buscas" v-slot="f" class="discover__field">
          <BaseInput v-bind="f" v-model="queryText" icon="ph:sparkle-fill" placeholder="Ej. «fitness o nutrición, con al menos 300 € por pack»" />
        </BaseField>
        <BaseButton type="submit" variant="brand" :loading="aiLoading || loading" :disabled="!queryText.trim()">Buscar con IA</BaseButton>
      </form>

      <div class="discover__actions">
        <BaseButton variant="outline" icon="ph:sliders-horizontal-bold" class="discover__filters-btn" @click="filtersOpen = true">
          Filtros<span v-if="activeCount" class="badge badge--on-light ml-1">{{ activeCount }}</span>
        </BaseButton>
        <BaseButton to="/favorites" variant="ghost" icon="ph:bookmark-simple-bold">
          Guardados<span v-if="savedCount" class="badge badge--on-light ml-1">{{ savedCount }}</span>
        </BaseButton>
      </div>
    </div>

    <p v-if="error" class="discover__error" role="alert">{{ error }}</p>

    <div class="discover__layout">
      <!-- Filtros: columna fija en escritorio; en móvil, hoja inferior -->
      <aside class="discover__aside" aria-label="Filtros">
        <DiscoverFilters v-model:categories="selectedCategories" v-model:min="minEuros" v-model:max="maxEuros" :active="hasActiveFilters" @clear="clearFilters" />
      </aside>

      <section class="discover__main" aria-live="polite">
        <!-- Estado de la IA -->
        <BaseCard v-if="aiLoading" tint="voltio" padding="sm" class="discover__ai-state">
          <Icon name="ph:circle-notch-bold" class="size-5 animate-spin shrink-0" />
          <p class="flex-1">La IA está ordenando los resultados por afinidad…</p>
          <BaseButton variant="ghost" size="sm" @click="cancelAi">Cancelar</BaseButton>
        </BaseCard>
        <BaseCard v-else-if="aiSummary" tone="overlay" padding="sm" class="discover__ai-state">
          <Icon name="ph:sparkle-fill" class="size-5 shrink-0 mt-0.5" />
          <div class="min-w-0 flex-1">
            <p>{{ aiSummary }}</p>
            <div v-if="aiCategories.length" class="mt-2 flex flex-wrap gap-1.5"><Chip v-for="c in aiCategories" :key="c" size="sm" tint="voltio">{{ c }}</Chip></div>
          </div>
        </BaseCard>

        <!-- Resumen y filtros activos -->
        <div v-if="searched" class="discover__summary">
          <p class="discover__count">{{ filtered.length }} {{ filtered.length === 1 ? noun.one : noun.many }}</p>
          <div v-if="hasActiveFilters" class="discover__active">
            <Chip v-for="cat in selectedCategories" :key="cat" size="sm" :selected="true" icon="ph:x-bold" @click="removeCategory(cat)">{{ cat }}</Chip>
            <Chip v-if="num(minEuros) !== null || num(maxEuros) !== null" size="sm" :selected="true" icon="ph:x-bold" @click="clearBudget">
              {{ num(minEuros) ? formatEuros(num(minEuros)! * 100) : '…' }}–{{ num(maxEuros) ? formatEuros(num(maxEuros)! * 100) : '…' }}
            </Chip>
          </div>
        </div>

        <!-- Cargando la primera vez -->
        <div v-if="showSkeleton" class="discover__grid" aria-busy="true">
          <div v-for="n in 8" :key="n" class="dcard dcard--skeleton"><SkeletonBlock height="9.5rem" rounded="0" /><div class="dcard__body"><SkeletonBlock width="60%" height="1.25rem" /><SkeletonBlock height="2.5rem" /></div></div>
        </div>

        <EmptyState
          v-else-if="searched && !filtered.length" icon="ph:magnifying-glass" :title="noun.none"
          :description="nameQuery.trim() ? 'Prueba con otro nombre o quita la búsqueda.' : 'Prueba a quitar algún filtro o a reformular tu búsqueda.'"
        >
          <BaseButton v-if="hasActiveFilters || nameQuery" variant="secondary" size="sm" icon="ph:x-bold" @click="clearFilters(); nameQuery = ''">Quitar filtros</BaseButton>
        </EmptyState>

        <template v-else>
          <section v-if="featured.length" class="discover__featured" aria-labelledby="discover-featured">
            <h2 id="discover-featured" class="discover__heading">Recomendados para ti</h2>
            <div class="discover__featured-grid">
              <DiscoveryCard
                v-for="(r, i) in featured" :key="r.id" :result="r" :kind="kind" :cta-label="ctaLabel" featured show-score :priority="i < 3"
                :is-pending="pendingIds.includes(r.id)" @contact="emit('contact', r)"
              />
            </div>
          </section>

          <h2 v-if="featured.length && visibleRest.length" class="discover__heading">Todos</h2>
          <div class="discover__grid">
            <DiscoveryCard
              v-for="(r, i) in visibleRest" :key="r.id" :result="r" :kind="kind" :cta-label="ctaLabel" :show-score="scoreMeaningful"
              :priority="!featured.length && i < 4" :is-pending="pendingIds.includes(r.id)" @contact="emit('contact', r)"
            />
          </div>

          <div ref="sentinel" class="discover__more">
            <BaseButton v-if="hasMore" variant="secondary" @click="visibleCount += PAGE_SIZE">Mostrar más</BaseButton>
          </div>
        </template>
      </section>
    </div>

    <BottomSheet v-model="filtersOpen" title="Filtros">
      <DiscoverFilters v-model:categories="selectedCategories" v-model:min="minEuros" v-model:max="maxEuros" :active="hasActiveFilters" @clear="clearFilters" />
      <BaseButton variant="primary" size="lg" block class="mt-5" @click="filtersOpen = false">Ver {{ filtered.length }} {{ filtered.length === 1 ? noun.one : noun.many }}</BaseButton>
    </BottomSheet>
  </div>
</template>

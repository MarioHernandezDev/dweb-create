<script setup lang="ts">
import { useDebounceFn, useIntersectionObserver } from '@vueuse/core'
import { formatEuros } from '~/utils/mock-data'
import type { DiscoveryResult } from '~/composables/useDiscover'
import { platformMeta } from '~/utils/mock-data'
import { prefersReducedMotion } from '~/composables/useGsap'
import { matchesClientFilters, sortResults, SORT_LABELS, COLLAB_TYPES, type DiscoverSort, type ResponseFilter } from '~/utils/discover-view'
import type { SavedSearch } from '~/composables/useSavedSearches'

/**
 * Exploración de Descubrir, igual para los dos roles: `kind` es lo que se
 * lista (`partner` para un creador, `creator` para un partner). La página
 * solo aporta el texto y lo que pasa al contactar.
 *
 * Pensada para ser cómoda y rápida:
 *  - los filtros se aplican solos (con una pausa de 0,4 s), sin botón «Buscar»;
 *  - la búsqueda por nombre filtra en el cliente, al instante;
 *  - «Con IA» sí tiene botón explícito (cuesta una llamada al modelo);
 *  - redes y tiempo de respuesta se filtran en el cliente (datos reales de actividad), y hay varios órdenes;
 *  - «Guardar búsqueda» guarda los criterios en la cuenta (useSavedSearches);
 *  - recomendados arriba solo si hay un criterio de verdad (categorías o IA) y se ordena por afinidad;
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

const toast = useToast()
const noun = computed(() => (props.kind === 'partner'
  ? { one: 'marca', many: 'marcas', budget: 'Presupuesto', none: 'Ninguna marca encaja con esta búsqueda' }
  : { one: 'creador', many: 'creadores', budget: 'Tarifa', none: 'Ningún creador encaja con esta búsqueda' }))

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
const platforms = ref<string[]>([])
const response = ref<ResponseFilter>('any')
const types = ref<string[]>([])
const verifiedOnly = ref(false)
const sort = ref<DiscoverSort>('affinity')
const { items: savedSearches, add: addSavedSearch, remove: removeSavedSearch } = useSavedSearches(props.kind)
const savedMenuOpen = ref(false)

// Un campo numérico vacío llega como '' (no null).
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const hasBudget = computed(() => num(minEuros.value) !== null || num(maxEuros.value) !== null)
const hasActiveFilters = computed(() => selectedCategories.value.length > 0 || hasBudget.value || platforms.value.length > 0 || response.value !== 'any' || types.value.length > 0 || verifiedOnly.value)
const activeCount = computed(() => selectedCategories.value.length + (hasBudget.value ? 1 : 0) + platforms.value.length + (response.value !== 'any' ? 1 : 0) + types.value.length + (verifiedOnly.value ? 1 : 0))

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
  platforms.value = []
  response.value = 'any'
  types.value = []
  verifiedOnly.value = false
}
function removePlatform(p: string) { platforms.value = platforms.value.filter((x) => x !== p) }

// ---- Búsquedas guardadas -------------------------------------------------
const canSaveSearch = computed(() => hasActiveFilters.value || nameQuery.value.trim().length > 0)
function currentLabel() {
  const bits = [...selectedCategories.value, ...platforms.value.map((p) => platformMeta[p as keyof typeof platformMeta]?.label ?? p)]
  if (hasBudget.value) bits.push(`${num(minEuros.value) ?? 0}–${num(maxEuros.value) ?? '∞'} €`)
  if (nameQuery.value.trim()) bits.unshift(`«${nameQuery.value.trim()}»`)
  return bits.slice(0, 4).join(' · ') || 'Búsqueda'
}
async function saveSearch() {
  if (!canSaveSearch.value) return
  const ok = await addSavedSearch(currentLabel(), {
    categories: [...selectedCategories.value], minEuros: num(minEuros.value), maxEuros: num(maxEuros.value),
    platforms: [...platforms.value], response: response.value, types: [...types.value], verifiedOnly: verifiedOnly.value, sort: sort.value, nameQuery: nameQuery.value
  })
  if (ok) toast.success('Búsqueda guardada en tu cuenta')
  else toast.error('No se ha podido guardar la búsqueda. Inténtalo de nuevo.')
}
async function deleteSavedSearch(id: string) {
  if (!(await removeSavedSearch(id))) toast.error('No se ha podido borrar la búsqueda.')
}
function applySavedSearch(item: SavedSearch) {
  const st = item.state
  mode.value = 'explore'
  selectedCategories.value = [...st.categories]
  minEuros.value = st.minEuros
  maxEuros.value = st.maxEuros
  platforms.value = [...st.platforms]
  response.value = st.response
  types.value = [...(st.types ?? [])]
  verifiedOnly.value = !!st.verifiedOnly
  sort.value = st.sort
  nameQuery.value = st.nameQuery
  savedMenuOpen.value = false
}
function removeCategory(cat: string) { selectedCategories.value = selectedCategories.value.filter((c) => c !== cat) }
function clearBudget() { minEuros.value = null; maxEuros.value = null }

// Carga inicial (también en el servidor): el directorio entero, sin pulsar nada.
await runSearch()

// ---- Lo que se ve --------------------------------------------------------
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const byName = computed(() => {
  const q = norm(nameQuery.value.trim())
  return q ? results.value.filter((r) => norm(r.name).includes(q)) : results.value
})
// Cuántos resultados tiene cada red (con el resto de filtros ya aplicados, salvo la propia red).
const platformCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const r of byName.value.filter((x) => matchesClientFilters(x, { platforms: [], response: response.value, types: types.value, verifiedOnly: verifiedOnly.value }))) {
    for (const p of r.platforms) counts[p] = (counts[p] ?? 0) + 1
  }
  return counts
})
const filtered = computed(() => sortResults(
  byName.value.filter((r) => matchesClientFilters(r, { platforms: platforms.value, response: response.value, types: types.value, verifiedOnly: verifiedOnly.value })),
  sort.value
))
const sortOptions = computed(() => (Object.keys(SORT_LABELS) as DiscoverSort[]).filter((k) => k !== 'followers' || props.kind === 'creator').map((k) => ({ value: k, label: SORT_LABELS[k] })))
const countNote = computed(() => (sort.value === 'affinity'
  ? (scoreMeaningful.value ? 'ordenados por afinidad' : 'sin criterio de afinidad todavía')
  : `orden: ${SORT_LABELS[sort.value].toLowerCase()}`))
const scoreMeaningful = computed(() => selectedCategories.value.length > 0 || results.value.some((r) => r.reason))
// Recomendados: los 3 primeros, solo con criterio y sin búsqueda por nombre.
const featured = computed(() => (scoreMeaningful.value && sort.value === 'affinity' && !nameQuery.value.trim() ? filtered.value.slice(0, 3) : []))
const rest = computed(() => filtered.value.slice(featured.value.length))
const visibleRest = computed(() => rest.value.slice(0, visibleCount.value))
const hasMore = computed(() => rest.value.length > visibleCount.value)
const showSkeleton = computed(() => loading.value && !results.value.length)

// Vista: rejilla o carrusel (GSAP, ver ResultsCarousel.vue). Al filtrar o buscar por nombre se
// pasa sola al carrusel; si la persona elige una vista, se respeta su elección.
const CAROUSEL_MIN = 2
const CAROUSEL_MAX = 24
const viewOptions = [{ value: 'grid', label: 'Rejilla' }, { value: 'carousel', label: 'Carrusel' }]
const view = ref<'grid' | 'carousel'>('grid')
const viewPicked = ref(false)
// Solo en el navegador (y sin «reducir movimiento»): el servidor pinta siempre la rejilla.
const clientReady = ref(false)
onMounted(() => { clientReady.value = !prefersReducedMotion() })
const carouselAllowed = computed(() => clientReady.value && filtered.value.length >= CAROUSEL_MIN)
const showCarousel = computed(() => view.value === 'carousel' && carouselAllowed.value)
const filteringNow = computed(() => hasActiveFilters.value || nameQuery.value.trim().length > 0)
watch(filteringNow, (on) => { if (!viewPicked.value) view.value = on ? 'carousel' : 'grid' })
function pickView(v: string) { viewPicked.value = true; view.value = v as 'grid' | 'carousel' }

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
        <DiscoverFilters
          v-model:categories="selectedCategories" v-model:min="minEuros" v-model:max="maxEuros" v-model:platforms="platforms" v-model:response="response" v-model:types="types" v-model:verified-only="verifiedOnly" :brand-filters="kind === 'partner'"
          :active="hasActiveFilters" :platform-counts="platformCounts" :budget-label="noun.budget" @clear="clearFilters"
        />
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
          <div class="discover__headline">
            <p class="discover__count">{{ filtered.length }} {{ filtered.length === 1 ? noun.one : noun.many }}</p>
            <p class="discover__note">{{ countNote }}</p>
          </div>
          <div class="discover__tools">
            <label class="discover__sort">
              <span class="sr-only">Ordenar</span>
              <select :value="sort" aria-label="Ordenar resultados" @change="sort = ($event.target as HTMLSelectElement).value as DiscoverSort">
                <option v-for="o in sortOptions" :key="o.value" :value="o.value">Ordenar: {{ o.label }}</option>
              </select>
              <Icon name="ph:caret-down-bold" class="size-3.5" />
            </label>
            <div class="discover__savewrap">
              <BaseButton variant="brand" icon="ph:heart" :disabled="!canSaveSearch" :title="canSaveSearch ? 'Guarda estos filtros en tu cuenta' : 'Elige algún filtro o escribe un nombre para guardar la búsqueda'" @click="saveSearch">Guardar búsqueda</BaseButton>
              <BaseButton v-if="savedSearches.length" variant="ghost" icon="ph:clock-counter-clockwise" :aria-expanded="savedMenuOpen" @click="savedMenuOpen = !savedMenuOpen">
                Mis búsquedas<span class="badge badge--on-light ml-1">{{ savedSearches.length }}</span>
              </BaseButton>
              <ul v-if="savedMenuOpen && savedSearches.length" class="discover__saved" aria-label="Búsquedas guardadas">
                <li v-for="item in savedSearches" :key="item.id">
                  <button type="button" class="discover__saved-apply" @click="applySavedSearch(item)">{{ item.label }}</button>
                  <button type="button" class="discover__saved-del" :aria-label="`Borrar la búsqueda ${item.label}`" @click="deleteSavedSearch(item.id)"><Icon name="ph:x-bold" class="size-3.5" /></button>
                </li>
              </ul>
            </div>
            <SegmentedTabs v-if="carouselAllowed" :model-value="view" :options="viewOptions" label="Vista de los resultados" class="discover__view" @update:model-value="pickView" />
          </div>
          <div v-if="hasActiveFilters" class="discover__active">
            <span class="discover__active-label">Filtros activos:</span>
            <Chip v-for="cat in selectedCategories" :key="cat" size="sm" :selected="true" icon="ph:x-bold" @click="removeCategory(cat)">{{ cat }}</Chip>
            <Chip v-if="hasBudget" size="sm" :selected="true" icon="ph:x-bold" @click="clearBudget">
              {{ num(minEuros) ? formatEuros(num(minEuros)! * 100) : '…' }} - {{ num(maxEuros) ? formatEuros(num(maxEuros)! * 100) : '…' }}
            </Chip>
            <Chip v-for="p in platforms" :key="p" size="sm" :selected="true" icon="ph:x-bold" @click="removePlatform(p)">{{ platformMeta[p as keyof typeof platformMeta]?.label ?? p }}</Chip>
            <Chip v-for="t in types" :key="t" size="sm" :selected="true" icon="ph:x-bold" @click="types = types.filter((x) => x !== t)">{{ COLLAB_TYPES.find((c) => c.value === t)?.label ?? t }}</Chip>
            <Chip v-if="verifiedOnly" size="sm" :selected="true" icon="ph:x-bold" @click="verifiedOnly = false">Verificadas</Chip>
            <Chip v-if="response !== 'any'" size="sm" :selected="true" icon="ph:x-bold" @click="response = 'any'">Responde en &lt; {{ response }} h</Chip>
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

        <ResultsCarousel
          v-else-if="showCarousel" :results="filtered.slice(0, CAROUSEL_MAX)" :kind="kind" :cta-label="ctaLabel"
          :pending-ids="pendingIds" :show-score="scoreMeaningful" @contact="emit('contact', $event)"
        />

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
      <DiscoverFilters
        v-model:categories="selectedCategories" v-model:min="minEuros" v-model:max="maxEuros" v-model:platforms="platforms" v-model:response="response" v-model:types="types" v-model:verified-only="verifiedOnly" :brand-filters="kind === 'partner'"
        :active="hasActiveFilters" :platform-counts="platformCounts" :budget-label="noun.budget" @clear="clearFilters"
      />
      <BaseButton variant="primary" size="lg" block class="mt-5" @click="filtersOpen = false">Ver {{ filtered.length }} {{ filtered.length === 1 ? noun.one : noun.many }}</BaseButton>
    </BottomSheet>
  </div>
</template>

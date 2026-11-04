<script setup lang="ts">
import { emptyFilters, filterPosts, projectStats, type PostFilters, type PostSort } from '~/utils/post-library'
import type { Post, PostStatus } from '~/types'

useHead({ title: 'Publicaciones' })

const route = useRoute()
const router = useRouter()
const { posts, ensureLoaded, hasMore, loadingMore, loadMoreError, loadMore } = useMyPosts()
const { requests: collabRequests, ensureLoaded: ensureCollabRequestsLoaded } = useCollabRequests()
const { changeStatus, remove } = usePostActions()
const composerOpen = ref(false)

await Promise.all([ensureLoaded(), ensureCollabRequestsLoaded()])

// Dos vistas del MISMO conjunto de publicaciones y de los MISMOS filtros: el
// estado vive aquí (no en cada vista) para no perderlo al cambiar de una a otra.
// La vista y el proyecto activo van en la URL (`?vista=lista&colaboracion=<id>`).
const view = computed<'tablero' | 'lista'>(() => (route.query.vista === 'lista' ? 'lista' : 'tablero'))
const viewOptions = [
  { value: 'tablero', label: 'Tablero' },
  { value: 'lista', label: 'Lista' }
]
function setView(value: string) {
  router.replace({ query: { ...route.query, vista: value === 'lista' ? 'lista' : undefined } })
}

const filters = ref<PostFilters>({ ...emptyFilters(), project: typeof route.query.colaboracion === 'string' ? route.query.colaboracion : '' })
const sort = ref<PostSort>('due_asc')
watch(() => filters.value.project, (project) => {
  router.replace({ query: { ...route.query, colaboracion: project && project !== 'own' ? project : undefined } })
})

function projectNameOf(post: Post): string | null {
  if (!post.collaborationId) return null
  return collabRequests.value.find((c) => c.id === post.collaborationId)?.partnerName ?? 'Colaboración'
}

// Indicadores del proyecto activo (cálculo local sobre lo ya cargado).
const activeCollab = computed(() => collabRequests.value.find((c) => c.id === filters.value.project) ?? null)
const stats = computed(() => projectStats(filterPosts(posts.value, { ...emptyFilters(), project: filters.value.project })))

async function onMove(post: Post, status: PostStatus) {
  await changeStatus(post, status)
}
async function onRemove(post: Post) {
  await remove(post)
}

</script>

<template>
  <AppShell
    role="creator" title="Publicaciones" full-width
    :subtitle="view === 'tablero' ? 'Arrastra una card para cambiarla de fase' : 'Busca, ordena y gestiona todas tus publicaciones'"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <SegmentedTabs :model-value="view" :options="viewOptions" @update:model-value="setView" />
      <p v-if="activeCollab" class="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-muted)]" data-project-stats>
        <span class="font-medium text-[var(--color-text)]">{{ activeCollab.partnerName }}</span>
        <span>{{ stats.total }} entrega{{ stats.total === 1 ? '' : 's' }}</span>
        <span v-if="stats.overdue" class="text-[var(--color-status-alert)]">{{ stats.overdue }} atrasada{{ stats.overdue === 1 ? '' : 's' }}</span>
        <span v-if="stats.inReview">{{ stats.inReview }} en revisión</span>
        <span>{{ stats.published }} publicada{{ stats.published === 1 ? '' : 's' }}</span>
        <NuxtLink to="/creator/requests" class="font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]">Ver colaboración</NuxtLink>
      </p>
    </div>

    <PhaseBoard v-if="view === 'tablero'" v-model:filters="filters" />

    <template v-else>
      <PostFilterBar v-if="posts.length" v-model:filters="filters" v-model:sort="sort" :collabs="collabRequests" show-status show-sort class="mb-4">
        <template #end>
          <button type="button" class="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]" data-go-board @click="setView('tablero')">
            <Icon name="ph:kanban-bold" class="size-4" /> Ir al tablero{{ activeCollab ? ` de ${activeCollab.partnerName}` : '' }}
          </button>
        </template>
      </PostFilterBar>
      <PostLibraryList
        v-model:filters="filters" v-model:sort="sort" :posts="posts" :project-name-of="projectNameOf"
        @move="onMove" @remove="onRemove" @clear="filters = emptyFilters()" @create="composerOpen = true"
      />
    </template>

    <!-- Paginación: se traen de 300 en 300 por fecha de entrega; los filtros y el tablero trabajan sobre lo ya cargado. -->
    <div v-if="hasMore" class="mt-6 flex flex-col items-center gap-2" data-load-more>
      <p class="text-sm text-[var(--color-text-muted)]">Hay más publicaciones sin cargar: los filtros y el tablero solo ven las {{ posts.length }} cargadas.</p>
      <BaseButton variant="secondary" size="sm" icon="ph:arrow-down-bold" :icon-spin="loadingMore" :disabled="loadingMore" @click="loadMore">
        {{ loadingMore ? 'Cargando…' : 'Cargar más publicaciones' }}
      </BaseButton>
      <p v-if="loadMoreError" class="text-micro text-[var(--color-status-alert)]" role="alert">{{ loadMoreError }}</p>
    </div>

    <Fab :active="composerOpen" @click="composerOpen = true" />
    <PostComposerSheet v-model="composerOpen" />
  </AppShell>
</template>

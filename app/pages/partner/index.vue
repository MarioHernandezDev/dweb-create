<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import { isFichaIncomplete } from '~/utils/ficha'
import { relativeTime, isUnresolvedCollaborationStatus } from '~/utils/status'
import type { Creator, Post } from '~/types'
import type { FirstStep } from '~/components/onboarding/FirstSteps.vue'
import type { LastProposal } from '~/composables/useCollaborationOffers'

import { weekDays, overdueCount, phaseShares } from '~/utils/home-charts'

useHead({ title: 'Inicio' })

const { partner, ensurePartner } = useMyPartner()
const { collaborations, activeCount: activeCollaborations, awaitingMyResponseCount, ensureLoaded: ensureCollaborationsLoaded } = useMyCollaborations()
const { posts, ensureLoaded: ensurePostsLoaded, approvePost } = usePartnerPosts()
const { conversations, ensureConversations } = useChat()

// En paralelo, no en serie — cuatro consultas independientes.
await Promise.all([ensureCollaborationsLoaded(), ensurePostsLoaded(), ensurePartner()])
// Los mensajes solo alimentan el bloque de «mensajes sin leer»: no bloquean el primer pintado.
ensureConversations()

// Panel de descubrimiento: SIN await arriba a propósito, no debe bloquear el
// primer pintado — mismo criterio que creator/index.vue.
const { results: discoverResults, loading: discoverLoading, error: discoverError, search: runDiscoverSearch } = useDiscover()
runDiscoverSearch('filters', '', { categories: [], minBudgetCents: null, maxBudgetCents: null })
const suggestedCreators = computed(() => discoverResults.value.slice(0, 3))
// Paquetes de cada sugerencia («2 paquetes · desde 150 €»): lo que de verdad decide a quién contactar.
const { summarizePackagesOf } = usePackages()
const suggestedPackages = ref<Record<string, { count: number; minCents: number }>>({})
watch(suggestedCreators, async (list) => {
  if (!import.meta.client || !list.length) return
  suggestedPackages.value = await summarizePackagesOf(list.map((c) => c.profileId))
}, { immediate: true })

// Primera acción útil cuando todavía no hay ficha rellena (roadmap, sección
// 12) — sin esto, un partner nuevo no aparece con nada útil en
// /creator/discover y las búsquedas por categoría/presupuesto no lo cruzan.
const fichaIncomplete = computed(() => partner.value
  ? isFichaIncomplete({ bio: partner.value.bio, categories: partner.value.categories, minCents: partner.value.minBudgetCents, maxCents: partner.value.maxBudgetCents })
  : false)

// La demo de mock-data asumía una sola colaboración; en real puede haber
// varias (un partner puede trabajar con más de un creador a la vez) — de
// momento mostramos la más reciente como "la" colaboración de la cabecera,
// y el tablero de abajo ya agrega los posts de todas.
const primaryCollaboration = computed(() => collaborations.value[0] ?? null)
const collaborator = computed<Creator | null>(() => {
  const c = primaryCollaboration.value
  if (!c?.creatorName) return null
  return {
    id: c.creatorId,
    name: c.creatorName,
    niche: '',
    initials: initialsFromName(c.creatorName),
    hue: hueFromString(c.creatorName),
    weeklyTarget: 0
  }
})

// Solo las que de verdad esperan una respuesta TUYA — una que tú mismo
// propusiste y sigue 'requested' está esperando al creador, no a ti. Mismo
// criterio que `awaitingMyResponseCount` del composable (ver utils/status.ts).
// ¿Me toca responder? Los turnos se alternan: manda quien hizo la ÚLTIMA propuesta de precio (la inicial, o la última
// contraoferta). Antes solo se miraba quién inició, así que una contraoferta del creador sobre una solicitud mía no contaba.
const { loadLastProposers } = useCollaborationOffers()
const lastProposers = ref<Record<string, LastProposal>>({})
const unresolvedIds = computed(() => collaborations.value.filter((c) => isUnresolvedCollaborationStatus(c.status)).map((c) => c.id))
watch(unresolvedIds, async (ids) => { if (import.meta.client) lastProposers.value = await loadLastProposers(ids) }, { immediate: true })
/** Frase del panel destacado: si hay contraoferta, su importe y mensaje; si no, la propuesta inicial o el brief. */
function proposalLine(id: string, initialCents: number | null, brief: string): string {
  const last = lastProposers.value[id]
  if (last) return `Propone ${formatEuros(last.budgetCents)}${last.message ? ` · «${last.message.trim().slice(0, 90)}»` : ''}.`
  return initialCents ? `Propuesta de ${formatEuros(initialCents)}.` : brief
}
const pendingForMe = computed(() => collaborations.value.filter((c) => isUnresolvedCollaborationStatus(c.status) && (lastProposers.value[c.id]?.by ?? c.initiatedBy) === 'creator'))
const nextDeliveries = computed(() => posts.value.filter((p) => p.dueInDays >= 0 && p.dueInDays <= 3).sort((a, b) => a.dueInDays - b.dueInDays))

const pendingReview = computed(() => posts.value.filter((p) => p.status === 'ready_for_review'))
const reviewedPct = computed(() => (posts.value.length ? Math.round(((posts.value.length - pendingReview.value.length) / posts.value.length) * 100) : 0))

// El formulario de aprobar/pedir cambios vive en PostReviewActions.vue
// (compartido con la pestaña Calendario de /partner/requests) — aquí solo
// se abre la hoja de detalle con el post y se cierra cuando ese componente
// avisa de que ya terminó.
const detailOpen = ref(false)
const detailPost = ref<Post | null>(null)

function openDetail(post: Post) {
  detailPost.value = posts.value.find((p) => p.id === post.id) ?? post
  detailOpen.value = true
}

// Aprobar directo desde la fila del calendario, sin abrir la hoja — no
// necesita texto, a diferencia de "Pedir cambios" (que sí lo exige, así que
// abre la hoja con el formulario de PostReviewActions.vue).
const quickApproving = ref<string | null>(null)
async function quickApprove(postId: string) {
  quickApproving.value = postId
  try {
    await approvePost(postId)
  } finally {
    quickApproving.value = null
  }
}

// Panel destacado: fuera de plazo de revisión > solicitud de un creador sin
// responder > sin ninguna colaboración activa todavía > próxima entrega >
// invitación a descubrir cuando no hay nada pendiente.
const hero = computed(() => {
  const toReview = pendingReview.value[0]
  if (toReview) {
    return {
      coverUrl: toReview.mediaUrl ?? null, coverSeed: toReview.id, icon: 'ph:eye-fill',
      eyebrow: 'Por revisar', title: toReview.title,
      description: 'Un creador ha entregado esta publicación — apruébala o pide cambios.',
      ctaLabel: 'Revisar', ctaTo: '', actionPostId: toReview.id // sin ruta: abre PostDetailSheet con @cta-click
    }
  }
  const request = pendingForMe.value[0]
  if (request) {
    return {
      coverUrl: null, coverSeed: request.id, icon: 'ph:handshake-fill',
      eyebrow: 'Solicitud pendiente',
      title: lastProposers.value[request.id] ? `${request.creatorName ?? 'El creador'} te ha respondido con otro presupuesto` : `${request.creatorName ?? 'Un creador'} quiere colaborar contigo`,
      description: proposalLine(request.id, request.budgetCents, request.brief),
      ctaLabel: 'Responder', ctaTo: '/partner/requests', actionPostId: undefined
    }
  }
  if (!collaborator.value) {
    return {
      coverUrl: null, coverSeed: 'home-hero-partner-discover', icon: 'ph:magnifying-glass-bold',
      eyebrow: 'Siguiente paso', title: 'Descubre un creador de contenido para empezar',
      description: 'Explora Descubrir y contacta directamente con quien encaje con tu campaña.',
      ctaLabel: 'Descubrir', ctaTo: '/partner/discover', actionPostId: undefined
    }
  }
  const next = nextDeliveries.value[0]
  if (next) {
    return {
      coverUrl: next.mediaUrl ?? null, coverSeed: next.id, icon: 'ph:calendar-check-fill',
      eyebrow: next.dueInDays === 0 ? 'Entrega de hoy' : `Entrega en ${next.dueInDays} días`, title: next.title,
      description: null, ctaLabel: 'Ver detalle', ctaTo: '', actionPostId: next.id
    }
  }
  return {
    coverUrl: null, coverSeed: 'home-hero-partner-discover-more', icon: 'ph:compass-fill',
    eyebrow: 'Todo al día', title: 'Descubre más creadores para tu próxima campaña',
    description: 'Amplía tu red de colaboradores habituales desde Descubrir.',
    ctaLabel: 'Descubrir', ctaTo: '/partner/discover', actionPostId: undefined
  }
})
// Lo que exige una acción tuya (revisar una entrega, responder una solicitud) va ARRIBA, antes que los números y los
// gráficos; el resto del tiempo, el panel destacado se queda en su columna como sugerencia.
const heroUrgent = computed(() => !isFresh.value && (pendingReview.value.length > 0 || pendingForMe.value.length > 0))

function onHeroClick() {
  const post = posts.value.find((p) => p.id === hero.value.actionPostId)
  if (post) openDetail(post)
}

const unreadConversations = computed(() => conversations.value.filter((c) => c.unread).slice(0, 4))

// Gráficas de resumen (datos ya cargados; nada se consulta aparte).
const chartDays = computed(() => weekDays(posts.value, new Date()))
const chartOverdue = computed(() => overdueCount(posts.value))
const chartShares = computed(() => phaseShares(posts.value))

// Frase de estado: solo con lo que de verdad hay (nada inventado).
// Contador de tareas de la bandeja (lo rellena la barra superior); aquí solo se lee.
const taskCount = useState<number>('my-work-task-count', () => 0)
const statusLine = computed(() => {
  const parts: string[] = []
  if (pendingForMe.value.length) parts.push(`${pendingForMe.value.length} ${pendingForMe.value.length === 1 ? 'solicitud por responder' : 'solicitudes por responder'}`)
  if (pendingReview.value.length) parts.push(`${pendingReview.value.length} ${pendingReview.value.length === 1 ? 'entrega por revisar' : 'entregas por revisar'}`)
  if (unreadConversations.value.length) parts.push(`${unreadConversations.value.length} ${unreadConversations.value.length === 1 ? 'conversación con mensajes nuevos' : 'conversaciones con mensajes nuevos'}`)
  if (parts.length) return parts.join(' · ')
  if (isFresh.value) return 'Empieza por estos pasos para encontrar a tu primer creador.'
  // «Todo al día» solo si la bandeja tampoco tiene tareas (completar el brief, subir un entregable…).
  return taskCount.value > 0 ? `Tienes ${taskCount.value} ${taskCount.value === 1 ? 'tarea pendiente' : 'tareas pendientes'} en tu bandeja.` : 'Todo al día por ahora.'
})

// Cuenta sin actividad todavía (sin colaboraciones ni publicaciones): los números a cero y los gráficos vacíos no
// enseñan nada, así que se esconden y «Primeros pasos» pasa arriba. En cuanto hay actividad, vuelve lo normal.
const isFresh = computed(() => !collaborations.value.length && !posts.value.length)

// Primeros pasos: cada uno se marca solo con datos reales de la cuenta (ver FirstSteps.vue).
const firstSteps = computed<FirstStep[]>(() => [
  { label: 'Completa tu ficha pública', hint: 'Los creadores te encuentran en Descubrir por tu ficha.', done: !fichaIncomplete.value, to: '/partner/profile' },
  { label: 'Contacta con un creador', hint: 'Elige uno en Descubrir y envíale una solicitud.', done: collaborations.value.length > 0, to: '/partner/discover' },
  { label: 'Acordad la colaboración', hint: 'Cuando acepte, acordáis alcance, precio y entregas.', done: collaborations.value.some((c) => ['accepted', 'in_progress', 'completed'].includes(c.status)), to: '/partner/requests' }
])
</script>

<template>
  <AppShell role="partner" title="Inicio" :subtitle="partner?.name">
    <section class="home-greeting">
      <div>
        <h2 class="home-greeting__title">{{ partner?.name ? `¡Hola, ${partner.name}!` : '¡Bienvenido!' }} Organiza tus colaboraciones</h2>
        <p class="home-greeting__status">{{ statusLine }}</p>
      </div>
      <!-- Como en el creador: en escritorio y tablet la acción principal vive en la cabecera. -->
      <BaseButton to="/partner/discover" variant="brand" icon="ph:compass-bold" class="home-greeting__action" data-discover-cta>Descubrir creadores</BaseButton>
    </section>

    <HomeHeroCard
      v-if="heroUrgent" class="home-urgent"
      :cover-url="hero.coverUrl" :icon="hero.icon"
      :eyebrow="hero.eyebrow" :title="hero.title" :description="hero.description"
      :cta-label="hero.ctaLabel" :cta-to="hero.ctaTo || undefined"
      @cta-click="onHeroClick"
    />

    <FirstSteps v-if="isFresh" role="partner" :steps="firstSteps" class="home-firststeps" />

    <section v-if="!isFresh" class="home-stats">
      <StatTile label="Colaboraciones activas" :value="String(activeCollaborations)" tint="menta" />
      <StatTile label="Por responder" :value="String(pendingForMe.length)" tint="mantequilla" />
      <StatTile label="Por revisar" :value="String(pendingReview.length)" tint="rosa" />
      <StatTile label="Entregas próximas" :value="String(nextDeliveries.length)" tint="cielo" />
    </section>

    <section v-if="!isFresh" class="home-charts">
      <PanelCard title="Entregas de los próximos 7 días" description="Pendientes y publicadas, día a día">
        <WeekColumns :days="chartDays" :overdue="chartOverdue" />
      </PanelCard>
      <PanelCard title="Publicaciones por fase" description="Dónde está cada una ahora mismo">
        <PhaseStack :shares="chartShares" empty-text="Aún no hay publicaciones de tus colaboraciones: cuando un creador entregue la primera, verás aquí en qué fase está." />
      </PanelCard>
    </section>

    <div class="home-grid">
      <div class="home-col">
        <HomeHeroCard
          v-if="!isFresh && !heroUrgent"
          :cover-url="hero.coverUrl" :icon="hero.icon"
          :eyebrow="hero.eyebrow" :title="hero.title" :description="hero.description"
          :cta-label="hero.ctaLabel" :cta-to="hero.ctaTo || undefined"
          @cta-click="onHeroClick"
        />

        <section v-if="!isFresh">
          <SectionTitle title="Tu calendario" class="mb-3.5">
            <span class="text-sm text-[var(--text-muted)]">{{ reviewedPct }}% revisado</span>
          </SectionTitle>
          <WeekBoard :posts="posts" @open="openDetail">
            <template #actions="{ post }">
              <div v-if="post.status === 'ready_for_review'" class="mt-3 flex flex-wrap gap-2">
                <BaseButton variant="secondary" size="sm" icon="ph:arrow-counter-clockwise-bold" @click="openDetail(post)">Pedir cambios</BaseButton>
                <BaseButton variant="primary" size="sm" icon="ph:check-bold" :disabled="!!quickApproving" :icon-spin="quickApproving === post.id" @click="quickApprove(post.id)">Aprobar</BaseButton>
              </div>
            </template>
          </WeekBoard>
        </section>

        <section v-if="discoverLoading || discoverError || suggestedCreators.length">
          <SectionTitle title="Creadores que podrían encajar" class="mb-3">
            <NuxtLink to="/partner/discover" class="inline-flex items-center min-h-[var(--control-md)] px-1 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-strong)]">Ver todo</NuxtLink>
          </SectionTitle>
          <p v-if="discoverError" class="text-sm text-[var(--text-muted)]">No se han podido cargar sugerencias ahora mismo.</p>
          <div v-else class="grid sm:grid-cols-3 gap-3">
            <template v-if="discoverLoading">
              <SkeletonBlock v-for="n in 3" :key="`sk-${n}`" height="8rem" rounded="var(--radius-md)" />
            </template>
            <NuxtLink v-else v-for="c in suggestedCreators" :key="c.id" :to="`/profile/creator/${c.id}`" class="block">
              <BaseCard interactive class="h-full">
                <div class="flex items-center gap-3">
                  <BaseAvatar :initials="initialsFromName(c.name)" :hue="hueFromString(c.name)" size="md" />
                  <div class="min-w-0">
                    <p class="font-semibold leading-tight line-clamp-2">{{ c.name }}</p>
                    <p v-if="c.categories.length" class="text-sm text-[var(--text-muted)] truncate">{{ c.categories.slice(0, 2).join(' · ') }}</p>
                  </div>
                </div>
                <p v-if="suggestedPackages[c.profileId]" class="text-sm font-semibold mt-3 inline-flex items-center gap-1.5" data-suggested-packages>
                  <Icon name="ph:package-fill" class="size-4" />
                  {{ suggestedPackages[c.profileId]!.count }} {{ suggestedPackages[c.profileId]!.count === 1 ? 'paquete' : 'paquetes' }} · desde {{ formatEuros(suggestedPackages[c.profileId]!.minCents) }}
                </p>
                <p v-else-if="c.minCents || c.maxCents" class="text-sm text-[var(--text-muted)] mt-3 inline-flex items-center gap-1">
                  <Icon name="ph:currency-eur" class="size-4" />
                  {{ c.minCents ? formatEuros(c.minCents) : '…' }}–{{ c.maxCents ? formatEuros(c.maxCents) : '…' }}
                </p>
                <p v-else class="text-sm text-[var(--text-muted)] mt-3">Aún sin tarifa ni paquetes publicados</p>
              </BaseCard>
            </NuxtLink>
          </div>
        </section>
      </div>

      <div class="home-col">
        <PanelCard v-if="unreadConversations.length" title="Mensajes sin leer" padding="sm">
          <div class="activity">
            <NuxtLink v-for="c in unreadConversations" :key="c.id" :to="`/chat/${c.id}`" class="activity__row">
              <span class="activity__icon"><Icon name="ph:chat-circle-fill" class="size-4" /></span>
              <div class="min-w-0 flex-1">
                <p class="activity__title truncate">{{ c.otherName }}</p>
                <p class="activity__sub truncate">{{ c.lastMessagePreview ?? 'Mensaje nuevo' }}</p>
              </div>
              <span v-if="c.lastMessageAt" class="shrink-0 text-sm text-[var(--text-muted)]">{{ relativeTime(c.lastMessageAt) }}</span>
            </NuxtLink>
          </div>
        </PanelCard>

        <FirstSteps v-if="!isFresh" role="partner" :steps="firstSteps" />
      </div>
    </div>

    <PostDetailSheet v-model="detailOpen" :post="detailPost" :creator="collaborator ?? undefined">
      <template #actions="{ post }">
        <PostReviewActions v-if="post.status === 'ready_for_review'" class="mt-5" :post-id="post.id" :content-version="post.contentVersion" @done="detailOpen = false" />
      </template>
    </PostDetailSheet>
  </AppShell>
</template>

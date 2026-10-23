<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { formatEuros } from '~/utils/mock-data'
import { isFichaIncomplete } from '~/utils/ficha'
import { relativeTime } from '~/utils/status'
import type { Creator, Post } from '~/types'

useHead({ title: 'Calendario' })

const { partner, ensurePartner } = useMyPartner()
const { collaborations, ensureLoaded: ensureCollaborationsLoaded } = useMyCollaborations()
const { posts, ensureLoaded: ensurePostsLoaded, approvePost, requestChanges: requestPostChanges } = usePartnerPosts()
const { conversations, ensureConversations } = useChat()

// En paralelo, no en serie — cuatro consultas independientes.
await Promise.all([ensureCollaborationsLoaded(), ensurePostsLoaded(), ensurePartner(), ensureConversations()])

// Panel de descubrimiento: SIN await arriba a propósito, no debe bloquear el
// primer pintado — mismo criterio que creator/index.vue.
const { results: discoverResults, loading: discoverLoading, error: discoverError, search: runDiscoverSearch } = useDiscover()
runDiscoverSearch('filters', '', { categories: [], minBudgetCents: null, maxBudgetCents: null })
const suggestedCreators = computed(() => discoverResults.value.slice(0, 3))

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
    weeklyTarget: 0,
    followers: 0
  }
})

const activeCollaborations = computed(() => collaborations.value.filter((c) => c.status === 'accepted' || c.status === 'in_progress').length)
// Solo las que de verdad esperan una respuesta TUYA — una que tú mismo
// propusiste y sigue 'requested' está esperando al creador, no a ti.
const pendingForMe = computed(() => collaborations.value.filter((c) => c.status === 'requested' && c.initiatedBy === 'creator'))
const nextDeliveries = computed(() => posts.value.filter((p) => p.dueInDays >= 0 && p.dueInDays <= 3).sort((a, b) => a.dueInDays - b.dueInDays))

const pendingReview = computed(() => posts.value.filter((p) => p.status === 'ready_for_review'))
const reviewedPct = computed(() => (posts.value.length ? Math.round(((posts.value.length - pendingReview.value.length) / posts.value.length) * 100) : 0))

const acting = ref(false)
async function approve(postId: string, comment?: string) {
  acting.value = true
  try {
    await approvePost(postId, comment)
  } finally {
    acting.value = false
  }
}

async function requestChanges(postId: string, comment: string) {
  acting.value = true
  try {
    await requestPostChanges(postId, comment)
  } finally {
    acting.value = false
  }
}

// "Pedir cambios" ya no actúa al primer clic (el servidor exige un
// comentario real desde esta sesión) — abre la hoja de detalle, que es
// donde vive el formulario. "Aprobar" sigue siendo directo desde el
// tablero: no necesita texto, solo desde la hoja se ofrece añadir uno
// opcional.
const detailOpen = ref(false)
const detailPost = ref<Post | null>(null)
const reviewStage = ref<'idle' | 'requesting-changes'>('idle')
const changeComment = ref('')
const changeError = ref('')
const showApproveComment = ref(false)
const approveComment = ref('')

function openDetail(post: Post) {
  detailPost.value = posts.value.find((p) => p.id === post.id) ?? post
  reviewStage.value = 'idle'
  changeComment.value = ''
  changeError.value = ''
  showApproveComment.value = false
  approveComment.value = ''
  detailOpen.value = true
}

async function submitApprove(postId: string) {
  await approve(postId, approveComment.value)
  detailOpen.value = false
}

async function submitChanges(postId: string) {
  changeError.value = ''
  if (!changeComment.value.trim()) {
    changeError.value = 'Explica qué hay que cambiar.'
    return
  }
  try {
    await requestChanges(postId, changeComment.value)
    detailOpen.value = false
  } catch (e) {
    changeError.value = e instanceof Error ? e.message : 'No se ha podido enviar. Inténtalo de nuevo.'
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
      eyebrow: 'Solicitud pendiente', title: `${request.creatorName ?? 'Un creador'} quiere colaborar contigo`,
      description: request.budgetCents ? `Propuesta de ${formatEuros(request.budgetCents)}.` : request.brief,
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
function onHeroClick() {
  const post = posts.value.find((p) => p.id === hero.value.actionPostId)
  if (post) openDetail(post)
}

const unreadConversations = computed(() => conversations.value.filter((c) => c.unread).slice(0, 4))

const tips = computed(() => {
  const list: { icon: string; text: string; cta: string; to: string }[] = []
  if (fichaIncomplete.value) {
    list.push({ icon: 'ph:identification-card-fill', text: 'Completa tu ficha pública para que los creadores te encuentren en Descubrir.', cta: 'Completar', to: '/partner/profile' })
  }
  return list
})
</script>

<template>
  <AppShell role="partner" title="Calendario" :subtitle="partner?.name">
    <section class="mb-6">
      <h1 class="font-display text-[1.75rem] md:text-[2.125rem] leading-[1.1] text-[var(--color-text)]">¡Bienvenido! Organiza tus colaboraciones</h1>
    </section>

    <section class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatTile label="Colaboraciones activas" :value="String(activeCollaborations)" />
      <StatTile label="Solicitudes pendientes" :value="String(pendingForMe.length)" />
      <StatTile label="Por revisar" :value="String(pendingReview.length)" />
      <StatTile label="Entregas próximas" :value="String(nextDeliveries.length)" />
    </section>

    <div class="grid lg:grid-cols-[1fr_22rem] gap-5 items-start">
      <div class="flex flex-col gap-5 min-w-0">
        <HomeHeroCard
          :cover-url="hero.coverUrl" :cover-seed="hero.coverSeed" :icon="hero.icon"
          :eyebrow="hero.eyebrow" :title="hero.title" :description="hero.description"
          :cta-label="hero.ctaLabel" :cta-to="hero.ctaTo || undefined"
          @cta-click="onHeroClick"
        />

        <section>
          <div class="flex items-center justify-between mb-3.5">
            <h2 class="font-display text-[1.125rem] text-[var(--color-text)]">Tu calendario</h2>
            <span class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ reviewedPct }}% revisado</span>
          </div>
          <WeekBoard :posts="posts" @open="openDetail">
            <template #actions="{ post }">
              <div v-if="post.status === 'ready_for_review'" class="mt-3 flex gap-2">
                <BaseButton variant="secondary" size="sm" icon="ph:arrow-counter-clockwise-bold" @click="openDetail(post)">Pedir cambios</BaseButton>
                <BaseButton variant="primary" size="sm" icon="ph:check-bold" :disabled="acting" @click="approve(post.id)">Aprobar</BaseButton>
              </div>
            </template>
          </WeekBoard>
        </section>

        <section v-if="discoverLoading || discoverError || suggestedCreators.length">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-display text-[1.125rem] text-[var(--color-text)]">Creadores que podrían encajar</h2>
            <NuxtLink to="/partner/discover" class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Ver todo</NuxtLink>
          </div>
          <p v-if="discoverError" class="text-[0.8125rem] text-[var(--color-text-faint)]">No se han podido cargar sugerencias ahora mismo.</p>
          <div v-else class="grid sm:grid-cols-3 gap-3">
            <template v-if="discoverLoading">
              <div v-for="n in 3" :key="`sk-${n}`" class="h-32 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)] animate-pulse" />
            </template>
            <NuxtLink
              v-else v-for="c in suggestedCreators" :key="c.id" :to="`/profile/creator/${c.id}`"
              class="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 hover:border-[var(--color-hairline-strong)] transition-colors"
            >
              <p class="text-[0.9375rem] font-semibold text-[var(--color-text)] truncate">{{ c.name }}</p>
              <p v-if="c.categories.length" class="text-[0.75rem] text-[var(--color-text-muted)] mt-0.5 truncate">{{ c.categories.slice(0, 2).join(' · ') }}</p>
              <p v-if="c.minCents || c.maxCents" class="text-[0.75rem] text-[var(--color-text-faint)] mt-1.5 inline-flex items-center gap-1">
                <Icon name="ph:currency-eur" class="size-3" />
                {{ c.minCents ? formatEuros(c.minCents) : '…' }}–{{ c.maxCents ? formatEuros(c.maxCents) : '…' }}
              </p>
            </NuxtLink>
          </div>
        </section>
      </div>

      <div class="flex flex-col gap-5 min-w-0">
        <section v-if="unreadConversations.length" class="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
          <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Mensajes sin leer</h2>
          <div class="flex flex-col gap-1">
            <NuxtLink
              v-for="c in unreadConversations" :key="c.id" :to="`/chat/${c.id}`"
              class="flex items-center gap-3 py-2 px-1 -mx-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-ink-overlay)] transition-colors"
            >
              <span class="flex items-center justify-center size-8 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] shrink-0">
                <Icon name="ph:chat-circle-fill" class="size-3.5" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-[0.8125rem] font-medium text-[var(--color-text)] truncate">{{ c.otherName }}</p>
                <p class="text-[0.75rem] text-[var(--color-text-faint)] truncate">{{ c.lastMessagePreview ?? 'Mensaje nuevo' }}</p>
              </div>
              <span v-if="c.lastMessageAt" class="shrink-0 text-[0.6875rem] text-[var(--color-text-faint)]">{{ relativeTime(c.lastMessageAt) }}</span>
            </NuxtLink>
          </div>
        </section>

        <section v-if="tips.length" class="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)]/60 p-4">
          <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Para sacarle más partido</h2>
          <div class="flex flex-col gap-3">
            <div v-for="(tip, i) in tips" :key="i" class="flex items-start gap-2.5">
              <Icon :name="tip.icon" class="size-4 text-[var(--color-primary-500)] shrink-0 mt-0.5" />
              <p class="min-w-0 flex-1 text-[0.8125rem] text-[var(--color-text)] leading-snug">
                {{ tip.text }} <NuxtLink :to="tip.to" class="font-medium underline underline-offset-2">{{ tip.cta }}</NuxtLink>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <PostDetailSheet v-model="detailOpen" :post="detailPost" :creator="collaborator ?? undefined">
      <template #actions="{ post }">
        <div v-if="post.status === 'ready_for_review'" class="mt-5">
          <template v-if="reviewStage === 'requesting-changes'">
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="change-comment">¿Qué hay que cambiar?</label>
            <textarea
              id="change-comment" v-model="changeComment" rows="3" placeholder="Sé concreto — esto es justo lo que verá el creador…"
              class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
            />
            <p v-if="changeError" class="text-[0.75rem] text-[var(--color-status-alert)] mt-1.5">{{ changeError }}</p>
            <div class="flex gap-2.5 mt-3">
              <BaseButton variant="secondary" class="flex-1" :disabled="acting" @click="reviewStage = 'idle'">Cancelar</BaseButton>
              <BaseButton variant="primary" class="flex-1" :disabled="acting || !changeComment.trim()" :icon-spin="acting" @click="submitChanges(post.id)">Enviar</BaseButton>
            </div>
          </template>
          <template v-else>
            <textarea
              v-if="showApproveComment" v-model="approveComment" rows="2" placeholder="Comentario opcional al aprobar…"
              class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none mb-3"
            />
            <button v-else type="button" class="text-[0.75rem] text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2 mb-3" @click="showApproveComment = true">
              + Añadir un comentario
            </button>
            <div class="flex gap-2.5">
              <BaseButton variant="secondary" class="flex-1" icon="ph:arrow-counter-clockwise-bold" :disabled="acting" @click="reviewStage = 'requesting-changes'">Pedir cambios</BaseButton>
              <BaseButton variant="primary" class="flex-1" icon="ph:check-bold" :disabled="acting" :icon-spin="acting" @click="submitApprove(post.id)">Aprobar</BaseButton>
            </div>
          </template>
        </div>
      </template>
    </PostDetailSheet>
  </AppShell>
</template>

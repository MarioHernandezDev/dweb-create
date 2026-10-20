<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { Creator, Post } from '~/types'

useHead({ title: 'Calendario' })

const { partner } = useMyPartner()
const { collaborations, ensureLoaded: ensureCollaborationsLoaded } = useMyCollaborations()
const { posts, ensureLoaded: ensurePostsLoaded, approvePost, requestChanges: requestPostChanges } = usePartnerPosts()

// En paralelo, no en serie — dos consultas independientes.
await Promise.all([ensureCollaborationsLoaded(), ensurePostsLoaded()])

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

const pendingReview = computed(() => posts.value.filter((p) => p.status === 'ready_for_review').length)
const firstPendingId = computed(() => posts.value.find((p) => p.status === 'ready_for_review')?.id)
const reviewedPct = computed(() => (posts.value.length ? Math.round(((posts.value.length - pendingReview.value) / posts.value.length) * 100) : 0))

const acting = ref(false)
async function approve(postId: string) {
  acting.value = true
  try {
    await approvePost(postId)
  } finally {
    acting.value = false
  }
}

async function requestChanges(postId: string) {
  acting.value = true
  try {
    await requestPostChanges(postId)
  } finally {
    acting.value = false
  }
}

function approveNext() {
  if (firstPendingId.value) approve(firstPendingId.value)
}

function requestChangesNext() {
  if (firstPendingId.value) requestChanges(firstPendingId.value)
}

const detailOpen = ref(false)
const detailPost = ref<Post | null>(null)
function openDetail(post: Post) {
  detailPost.value = posts.value.find((p) => p.id === post.id) ?? post
  detailOpen.value = true
}

const quickActions = computed(() => [
  { label: 'Aprobar siguiente', icon: 'ph:check-circle-fill', action: approveNext, disabled: !firstPendingId.value },
  { label: 'Pedir cambios', icon: 'ph:arrow-counter-clockwise-bold', action: requestChangesNext, disabled: !firstPendingId.value },
  { label: 'Perfil', icon: 'ph:user-circle-fill', to: '/partner/profile' }
])
</script>

<template>
  <AppShell role="partner" title="Tu calendario" :subtitle="partner?.name">
    <section class="mb-5">
      <h1 class="font-display text-[2rem] md:text-[2.5rem] leading-[1.08] text-[var(--color-text)]">Hola, {{ partner?.name }}</h1>
      <p class="mt-1.5 text-[0.9375rem] text-[var(--color-text-muted)]">Tu calendario de contenido</p>
    </section>

    <section class="mb-6">
      <NuxtLink v-if="collaborator" to="/partner/discover" class="flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-md)] bg-[var(--color-ink-overlay)] hover:bg-[var(--color-ink-overlay)]/70 transition-colors">
        <BaseAvatar :initials="collaborator.initials" :hue="collaborator.hue" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="text-[0.875rem] text-[var(--color-text)]">
            Colaborando con <strong class="font-medium">{{ collaborator.name }}</strong>
          </p>
        </div>
        <Icon name="ph:caret-right-bold" class="size-4 text-[var(--color-text-faint)] shrink-0" />
      </NuxtLink>
      <NuxtLink v-else to="/partner/discover" class="flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-md)] bg-[var(--color-ink-overlay)] hover:bg-[var(--color-ink-overlay)]/70 transition-colors">
        <span class="flex items-center justify-center size-9 rounded-full bg-[var(--color-primary-500)]/12 text-[var(--color-primary-500)] shrink-0">
          <Icon name="ph:magnifying-glass-bold" class="size-4" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-[0.875rem] text-[var(--color-text)]">Aún no tienes ninguna colaboración activa</p>
          <p class="text-[0.75rem] text-[var(--color-text-faint)]">Descubre un creador de contenido para empezar</p>
        </div>
        <Icon name="ph:caret-right-bold" class="size-4 text-[var(--color-text-faint)] shrink-0" />
      </NuxtLink>
    </section>

    <section class="mb-6">
      <BaseCard radius="lg" padding="lg" class="flex items-center gap-4 md:max-w-md">
        <div class="min-w-0 flex-1">
          <p class="text-[0.9375rem] text-[var(--color-text)] leading-snug">
            Has revisado el <strong class="font-semibold">{{ reviewedPct }}%</strong> de tu calendario
          </p>
          <div class="mt-3 flex items-center gap-3">
            <div class="flex-1 h-2 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
              <div
                class="h-full rounded-full bg-[var(--color-primary-500)] transition-[width] duration-700 ease-[var(--ease-spring)]"
                :style="{ width: `${reviewedPct}%` }"
              />
            </div>
            <span class="shrink-0 text-[0.8125rem] text-[var(--color-text-faint)]" style="font-variant-numeric: proportional-nums">
              {{ posts.length - pendingReview }}/{{ posts.length }}
            </span>
          </div>
        </div>
        <button
          type="button" aria-label="Aprobar siguiente publicación" :disabled="!firstPendingId || acting"
          class="shrink-0 size-14 rounded-full bg-[var(--color-primary-500)] text-[var(--color-on-primary)] shadow-[0_10px_22px_-8px_var(--color-primary-500)] hover:shadow-[0_14px_28px_-6px_var(--color-primary-500)] flex items-center justify-center active:scale-90 transition-[transform,box-shadow] duration-300 ease-[var(--ease-spring-out)] disabled:opacity-40 disabled:pointer-events-none"
          @click="approveNext"
        >
          <Icon name="ph:check-fill" class="size-6" />
        </button>
      </BaseCard>
    </section>

    <section class="mb-8">
      <div class="flex justify-between md:justify-start md:gap-8">
        <component
          :is="action.to ? 'NuxtLink' : 'button'" v-for="action in quickActions" :key="action.label"
          :to="action.to" :type="!action.to ? 'button' : undefined" :disabled="!action.to && (action.disabled || acting)"
          class="flex flex-col items-center gap-1.5 flex-1 md:flex-none md:w-16"
          :class="action.disabled && 'pointer-events-none opacity-40'"
          @click="action.action?.()"
        >
          <span class="flex items-center justify-center size-14 rounded-full bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[var(--color-text)] transition-[transform,border-color] duration-200 ease-[var(--ease-spring)] active:scale-95 hover:border-[var(--color-hairline-strong)]">
            <Icon :name="action.icon" class="size-5" />
          </span>
          <span class="text-[0.75rem] text-[var(--color-text-muted)] text-center">{{ action.label }}</span>
        </component>
      </div>
    </section>

    <section v-if="pendingReview" class="mb-7">
      <BaseCard radius="md" padding="md" class="flex items-center gap-3 border-[var(--color-status-review)]/30 bg-[var(--color-status-review)]/[0.08]">
        <Icon name="ph:eye-fill" class="size-5 text-[var(--color-status-review)] shrink-0" />
        <p class="text-[0.875rem] text-[var(--color-text)]">
          Tienes {{ pendingReview }} publicación{{ pendingReview > 1 ? 'es' : '' }} esperando tu aprobación.
        </p>
      </BaseCard>
    </section>

    <WeekBoard :posts="posts" @open="openDetail">
      <template #actions="{ post }">
        <div v-if="post.status === 'ready_for_review'" class="mt-3 flex gap-2">
          <BaseButton variant="secondary" size="sm" icon="ph:arrow-counter-clockwise-bold" :disabled="acting" @click="requestChanges(post.id)">Pedir cambios</BaseButton>
          <BaseButton variant="primary" size="sm" icon="ph:check-bold" :disabled="acting" @click="approve(post.id)">Aprobar</BaseButton>
        </div>
      </template>
    </WeekBoard>

    <PostDetailSheet v-model="detailOpen" :post="detailPost" :creator="collaborator ?? undefined">
      <template #actions="{ post }">
        <div v-if="post.status === 'ready_for_review'" class="mt-5 flex gap-2.5">
          <BaseButton variant="secondary" class="flex-1" icon="ph:arrow-counter-clockwise-bold" :disabled="acting" @click="requestChanges(post.id); detailOpen = false">Pedir cambios</BaseButton>
          <BaseButton variant="primary" class="flex-1" icon="ph:check-bold" :disabled="acting" @click="approve(post.id); detailOpen = false">Aprobar</BaseButton>
        </div>
      </template>
    </PostDetailSheet>
  </AppShell>
</template>

<script setup lang="ts">
import { myBrand, myBrandInfluencerId, influencerPosts, influencers, managers } from '~/utils/mock-data'

useHead({ title: 'Calendario' })

const collaborator = influencers.find((i) => i.id === myBrandInfluencerId)!
const collaboratorManager = computed(() => managers.find((m) => m.id === collaborator.managerId))

const posts = ref(influencerPosts.filter((p) => p.influencerId === myBrandInfluencerId).map((p) => ({ ...p })))

const pendingReview = computed(() => posts.value.filter((p) => p.status === 'ready_for_review').length)
const firstPendingId = computed(() => posts.value.find((p) => p.status === 'ready_for_review')?.id)
const reviewedPct = computed(() => Math.round(((posts.value.length - pendingReview.value) / posts.value.length) * 100))

function approve(postId: string) {
  const post = posts.value.find((p) => p.id === postId)
  if (post) post.status = 'scheduled'
}

function requestChanges(postId: string) {
  const post = posts.value.find((p) => p.id === postId)
  if (post) post.status = 'in_production'
}

function approveNext() {
  if (firstPendingId.value) approve(firstPendingId.value)
}

function requestChangesNext() {
  if (firstPendingId.value) requestChanges(firstPendingId.value)
}

const quickActions = computed(() => [
  { label: 'Aprobar siguiente', icon: 'ph:check-circle-fill', action: approveNext, disabled: !firstPendingId.value },
  { label: 'Pedir cambios', icon: 'ph:arrow-counter-clockwise-bold', action: requestChangesNext, disabled: !firstPendingId.value },
  { label: 'Perfil', icon: 'ph:user-circle-fill', to: '/client/profile' }
])
</script>

<template>
  <AppShell role="client" title="Tu calendario" :subtitle="myBrand.name">
    <section class="mb-5">
      <h1 class="font-display text-[2rem] md:text-[2.5rem] leading-[1.08] text-[var(--color-text)]">Hola, {{ myBrand.name }}</h1>
      <p class="mt-1.5 text-[0.9375rem] text-[var(--color-text-muted)]">Tu calendario de contenido con la agencia</p>
    </section>

    <section class="mb-6">
      <NuxtLink to="/client/discover" class="flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-md)] bg-[var(--color-ink-overlay)] hover:bg-[var(--color-ink-overlay)]/70 transition-colors">
        <BaseAvatar :initials="collaborator.initials" :hue="collaborator.hue" size="sm" />
        <div class="min-w-0 flex-1">
          <p class="text-[0.875rem] text-[var(--color-text)]">
            Colaborando con <strong class="font-medium">{{ collaborator.name }}</strong>
          </p>
          <p class="text-[0.75rem] text-[var(--color-text-faint)]">
            {{ collaboratorManager ? `Representado por ${collaboratorManager.name}` : 'Influencer independiente' }}
          </p>
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
          type="button" aria-label="Aprobar siguiente publicación" :disabled="!firstPendingId"
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
          :to="action.to" :type="!action.to ? 'button' : undefined" :disabled="!action.to && action.disabled"
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

    <WeekBoard :posts="posts">
      <template #actions="{ post }">
        <div v-if="post.status === 'ready_for_review'" class="mt-3 flex gap-2">
          <BaseButton variant="secondary" size="sm" icon="ph:arrow-counter-clockwise-bold" @click="requestChanges(post.id)">Pedir cambios</BaseButton>
          <BaseButton variant="primary" size="sm" icon="ph:check-bold" @click="approve(post.id)">Aprobar</BaseButton>
        </div>
      </template>
    </WeekBoard>
  </AppShell>
</template>

<script setup lang="ts">
import { clients, agencyPosts } from '~/utils/mock-data'
import { coverPhotos } from '~/utils/images'

useHead({ title: 'Calendario' })
const cover = coverPhotos.client

const myClient = clients.find((c) => c.id === 'lumina')!
const posts = ref(agencyPosts.filter((p) => p.clientId === 'lumina').map((p) => ({ ...p })))

const pendingReview = computed(() => posts.value.filter((p) => p.status === 'ready_for_review').length)

function approve(postId: string) {
  const post = posts.value.find((p) => p.id === postId)
  if (post) post.status = 'scheduled'
}

function requestChanges(postId: string) {
  const post = posts.value.find((p) => p.id === postId)
  if (post) post.status = 'in_production'
}
</script>

<template>
  <AppShell role="client" title="Tu calendario" :subtitle="myClient.name">
    <section class="relative rounded-[var(--radius-lg)] overflow-hidden mb-7 h-36 md:h-44">
      <CoverImage :photo="cover" :width="1200" :height="420" scrim="full" class="absolute inset-0" />
      <div class="relative h-full flex flex-col justify-end p-6 md:p-8">
        <p class="font-display text-[1.75rem] md:text-[2rem] leading-none text-white">{{ myClient.name }}</p>
        <p class="mt-1.5 text-[0.9375rem] text-white/70">Tu calendario de contenido con la agencia</p>
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

<script setup lang="ts">
import { contentTypeMeta, dueLabel, isPostOverdue, overdueLabel, partnerNextStepHint } from '~/utils/status'
import { linkHost } from '~/utils/delivery-links'
import { platformMeta } from '~/utils/mock-data'
import type { Creator, Post } from '~/types'

const props = defineProps<{
  post: Post | null
  creator?: Creator
}>()

const open = defineModel<boolean>({ default: false })

// Checklist de solo lectura (ver supabase/migrations/20261025160000_
// checklist_partner_visibility.sql) — mismo composable que ya usa el
// creador, sin checkbox interactivo: aquí es información de progreso, no
// una acción del partner. Se carga perezosamente al abrir la hoja, nunca
// bloqueando el resto del contenido ya disponible sin red.
const { itemsByPost, ensureItems } = useChecklist()
const checklistItems = computed(() => (props.post ? itemsByPost.value[props.post.id] ?? [] : []))
watch(() => props.post?.id, (postId) => { if (postId) ensureItems(postId) }, { immediate: true })
</script>

<template>
  <BottomSheet v-model="open" :title="post?.title ?? 'Publicación'">
    <template v-if="post">
      <div class="relative h-32 rounded-[var(--radius-md)] overflow-hidden mb-5">
        <CoverArt :seed="post.id" :icon="contentTypeMeta[post.contentType].icon" />
        <SmartImage v-if="post.mediaUrl" :src="post.mediaUrl" :width="640" :height="360" class="absolute inset-0 size-full object-cover" />
      </div>

      <div class="flex items-center gap-2 flex-wrap mb-4">
        <StatusPill :status="post.status" />
        <span v-if="isPostOverdue(post)" class="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-status-alert)]">
          <Icon name="ph:warning-fill" class="size-4" />
          {{ overdueLabel(post.dueInDays) }}
        </span>
        <span v-if="creator" class="text-sm text-[var(--color-text-muted)]">{{ creator.name }}</span>
        <span class="text-sm text-[var(--color-text-faint)]">· {{ dueLabel(post.dueInDays) }}</span>
      </div>

      <p class="text-sm text-[var(--color-text-muted)] leading-relaxed mb-4">{{ partnerNextStepHint(post.status) }}</p>

      <!-- Enlaces de entrega: el borrador para revisar (vídeo o archivo pesado fuera de CIBERAN) y la publicación final. -->
      <div v-if="post.draftUrl || post.resultUrl" class="flex flex-wrap gap-2 mb-4" data-post-links>
        <a v-if="post.draftUrl" :href="post.draftUrl" target="_blank" rel="noopener noreferrer nofollow" class="btn btn--secondary btn--sm" data-draft-link>
          <Icon name="ph:play-circle-bold" class="btn__icon" /><span>Ver el borrador ({{ linkHost(post.draftUrl) }})</span>
        </a>
        <a v-if="post.resultUrl" :href="post.resultUrl" target="_blank" rel="noopener noreferrer nofollow" class="btn btn--primary btn--sm" data-result-link>
          <Icon name="ph:arrow-square-out-bold" class="btn__icon" /><span>Ver la publicación ({{ linkHost(post.resultUrl) }})</span>
        </a>
      </div>

      <p v-if="post.caption" class="text-base text-[var(--color-text)] leading-relaxed mb-4">{{ post.caption }}</p>
      <p v-else class="text-base text-[var(--color-text-faint)] italic mb-4">Sin caption todavía.</p>
      <p v-if="post.status === 'ready_for_review' && !post.mediaUrl && !post.caption && !post.draftUrl" class="flex gap-2 text-sm rounded-[var(--radius-sm)] bg-[var(--color-mantequilla)] text-[var(--color-tinta-950)] px-3 py-2 mb-4" data-review-incomplete>
        <Icon name="ph:info-bold" class="size-4 mt-0.5 shrink-0" />
        Esta pieza llega sin imagen ni texto. Si no es lo que esperabas, usa «Pedir cambios» para que la completen antes de aprobarla.
      </p>

      <div class="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mb-4">
        <span class="inline-flex items-center gap-1.5">
          <Icon :name="platformMeta[post.platform].icon" class="size-4" :style="{ color: platformMeta[post.platform].colorVar }" />
          {{ platformMeta[post.platform].label }}
        </span>
        <span>{{ contentTypeMeta[post.contentType].label }}</span>
      </div>

      <p v-if="post.hashtags.length" class="flex flex-wrap gap-1.5">
        <span v-for="tag in post.hashtags" :key="tag" class="text-sm text-[var(--color-text-faint)]">{{ tag }}</span>
      </p>

      <div v-if="checklistItems.length" class="mt-4">
        <h3 class="text-sm font-semibold text-[var(--text-muted)] mb-2">Checklist</h3>
        <ul class="flex flex-col gap-1.5">
          <li v-for="item in checklistItems" :key="item.id" class="flex items-center gap-2 text-sm">
            <Icon
              :name="item.done ? 'ph:check-square-fill' : 'ph:square-bold'"
              class="size-4 shrink-0" :class="item.done ? 'text-[var(--color-status-published)]' : 'text-[var(--color-text-faint)]'"
            />
            <span :class="item.done ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'">{{ item.text }}</span>
          </li>
        </ul>
      </div>

      <slot name="actions" :post="post" />
    </template>
  </BottomSheet>
</template>

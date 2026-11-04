<script setup lang="ts">
import type { Post, PostStatus } from '~/types'
import { contentTypeMeta, statusMeta, overdueLabel } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'

defineProps<{ post: Post; phases: PostStatus[]; overdue?: boolean; /** Proyecto = nombre del partner de la colaboración; null/undefined = contenido propio (sin chip). */ project?: string | null }>()
defineEmits<{ open: [post: Post]; move: [status: PostStatus] }>()

// Cargadas una sola vez desde PhaseBoard.vue (onMounted) — este componente
// solo lee el `useState` ya compartido para resolver color/nombre.
const { labels } = useLabels()

</script>

<template>
  <!-- No es un <button> real: la tarjeta tiene un <select> interactivo dentro
       (el cambio de fase), y un botón no puede contener otro control
       interactivo. role="button" + tabindex + Enter/Espacio es el patrón
       correcto para ese caso. -->
  <div
    class="post-card" :class="overdue && 'post-card--overdue'" role="button" tabindex="0" :aria-label="`Abrir «${post.title}»`"
    @click="$emit('open', post)" @keydown.enter="$emit('open', post)" @keydown.space.prevent="$emit('open', post)"
  >
    <div class="post-card__cover">
      <SmartImage v-if="post.mediaUrl" :src="post.mediaUrl" :width="320" :height="160" class="post-card__photo" />
      <CoverArt v-else :seed="post.id" :icon="contentTypeMeta[post.contentType].icon" />
      <span class="post-card__platform" :title="platformMeta[post.platform].label">
        <Icon :name="platformMeta[post.platform].icon" class="size-3.5" />
      </span>
    </div>

    <div class="post-card__body">
      <div v-if="post.labelIds.length" class="post-card__labels">
        <span
          v-for="id in post.labelIds" :key="id" class="post-card__label"
          :style="{ '--label': labels.find((l) => l.id === id)?.color }"
        />
      </div>

      <p class="post-card__title">{{ post.title }}</p>

      <p v-if="project" class="post-card__meta" data-card-project>
        <Icon name="ph:handshake-fill" class="size-3.5 shrink-0" /> <span class="truncate">{{ project }}</span>
      </p>
      <p v-if="overdue" class="post-card__meta post-card__meta--danger">
        <Icon name="ph:warning-fill" class="size-3.5 shrink-0" />
        {{ overdueLabel(post.dueInDays) }}
      </p>
      <p v-if="post.checklist.total" class="post-card__meta">
        <Icon name="ph:check-square-fill" class="size-3.5 shrink-0" />
        {{ post.checklist.done }}/{{ post.checklist.total }}
      </p>

      <div class="post-card__foot">
        <label class="phase-chip phase-chip--select" :data-status="post.status">
          <select
            :value="post.status" aria-label="Cambiar de fase"
            @click.stop
            @change="$emit('move', ($event.target as HTMLSelectElement).value as PostStatus)"
          >
            <option v-for="p in phases" :key="p" :value="p">{{ statusMeta[p].label }}</option>
          </select>
          <Icon name="ph:caret-down-bold" class="size-3 shrink-0" />
        </label>
      </div>
    </div>
  </div>
</template>

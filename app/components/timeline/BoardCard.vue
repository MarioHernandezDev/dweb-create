<script setup lang="ts">
import type { Post, PostStatus } from '~/types'
import { contentTypeMeta, statusMeta, overdueLabel } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'

defineEmits<{ open: [post: Post]; move: [status: PostStatus] }>()

// Cargadas una sola vez desde PhaseBoard.vue (onMounted) — este componente
// solo lee el `useState` ya compartido para resolver color/nombre.
const props = defineProps<{ post: Post; phases: PostStatus[]; overdue?: boolean; /** Proyecto = nombre del partner de la colaboración; null/undefined = contenido propio (sin chip). */ project?: string | null }>()
const { labels } = useLabels()

// Hasta dos etiquetas con su nombre; el resto, como «+N».
const MAX_LABELS = 2
const postLabels = computed(() => props.post.labelIds.map((id) => labels.value.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l))

// La fecha que importa: la de entrega mientras no esté publicada; la de publicación después.
const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const dateLine = computed(() => {
  const p = props.post
  if (p.status === 'published') return p.publishedAt ? `Publicada ${dateFmt.format(new Date(p.publishedAt))}` : null
  return p.dueDate ? `Entrega ${dateFmt.format(new Date(`${p.dueDate}T12:00:00`))}` : null
})

</script>

<template>
  <!-- La tarjeta lleva un <select> dentro (el cambio de fase), así que no puede ser un botón ni llevar role="button":
       un control no puede contener a otro. Con ratón se abre pulsando en cualquier parte; con teclado y lector de
       pantalla, el botón real es el título (su nombre es el propio título). -->
  <div class="post-card" :class="overdue && 'post-card--overdue'" @click="$emit('open', post)">
    <div class="post-card__cover">
      <SmartImage v-if="post.mediaUrl" :src="post.mediaUrl" :width="320" :height="160" class="post-card__photo" />
      <CoverArt v-else :seed="post.id" :icon="contentTypeMeta[post.contentType].icon" />
      <span class="post-card__platform" :title="[post.platform, ...(post.extraPlatforms ?? [])].map((p) => platformMeta[p].label).join(', ')">
        <Icon :name="platformMeta[post.platform].icon" class="size-3.5" />
        <Icon v-for="p in post.extraPlatforms ?? []" :key="p" :name="platformMeta[p].icon" class="size-3.5" />
      </span>
    </div>

    <div class="post-card__body">
      <div v-if="postLabels.length" class="post-card__labels">
        <span v-for="l in postLabels.slice(0, MAX_LABELS)" :key="l.id" class="post-card__label" :style="{ '--label': l.color }">{{ l.name }}</span>
        <span v-if="postLabels.length > MAX_LABELS" class="post-card__label post-card__label--more" :title="postLabels.slice(MAX_LABELS).map((l) => l.name).join(', ')">+{{ postLabels.length - MAX_LABELS }}</span>
      </div>

      <p class="post-card__title"><button type="button" class="post-card__open">{{ post.title }}</button></p>

      <p v-if="overdue" class="post-card__chip post-card__chip--danger">{{ overdueLabel(post.dueInDays) }}</p>
      <p v-else-if="post.status !== 'published' && post.dueInDays === 1" class="post-card__chip">Vence mañana</p>
      <p v-else-if="post.status !== 'published' && post.dueInDays === 0" class="post-card__chip">Vence hoy</p>

      <p v-if="dateLine" class="post-card__meta" data-card-date>
        <Icon :name="post.status === 'published' ? 'ph:check-circle' : 'ph:calendar-blank'" class="size-3.5 shrink-0" />{{ dateLine }}
      </p>

      <p v-if="project" class="post-card__project" data-card-project>Campaña: <strong>{{ project }}</strong></p>
      <div v-if="post.checklist.total" class="post-card__progress" :aria-label="`Checklist: ${post.checklist.done} de ${post.checklist.total}`">
        <span class="post-card__bar"><span :style="{ width: `${Math.round((post.checklist.done / post.checklist.total) * 100)}%` }" /></span>
        <span>{{ post.checklist.done }}/{{ post.checklist.total }}</span>
      </div>

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

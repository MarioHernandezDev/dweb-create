<script setup lang="ts">
import { statusMeta, creatorNextStepHint } from '~/utils/status'
import type { Post, PostStatus } from '~/types'

/** «Qué toca ahora»: la pista de la fase, el botón de avanzar (o devolver) y, si la marca pidió cambios, su comentario. */
defineProps<{
  post: Post
  pendingChange: { authorName: string; comment: string | null } | null
  prevStatus: PostStatus | null
  nextStatus: PostStatus | null
  advanceLabel: string
  waitingForPartner: boolean
  moving: boolean
}>()
const emit = defineEmits<{ move: [status: PostStatus] }>()
</script>

<template>
  <section class="pnext" :class="pendingChange && 'pnext--changes'" aria-label="Siguiente paso">
    <div class="pnext__text">
      <template v-if="pendingChange">
        <p class="pnext__label">{{ pendingChange.authorName }} ha pedido cambios</p>
        <p v-if="pendingChange.comment" class="pnext__quote">{{ pendingChange.comment }}</p>
      </template>
      <template v-else>
        <p class="pnext__label">{{ post.status === 'published' ? 'Publicada' : waitingForPartner ? 'En manos de la marca' : 'Qué toca ahora' }}</p>
        <p class="pnext__hint">{{ creatorNextStepHint(post, false) }}</p>
      </template>
    </div>
    <div class="pnext__actions">
      <BaseButton v-if="prevStatus" variant="ghost" size="sm" :disabled="moving" @click="emit('move', prevStatus)">
        Devolver a «{{ statusMeta[prevStatus].label }}»
      </BaseButton>
      <BaseButton v-if="nextStatus && !waitingForPartner" variant="primary" icon="ph:arrow-right-bold" :loading="moving" @click="emit('move', nextStatus)">
        {{ advanceLabel }}
      </BaseButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { contentTypeMeta, statusMeta } from '~/utils/status'
import { platformMeta, suggestionsForDraft } from '~/utils/mock-data'
import type { PostStatus } from '~/types'

const route = useRoute()
const router = useRouter()
const { posts, ensureLoaded, updatePost, deletePost } = useMyPosts()
const { balance: creditBalance, ensureLoaded: ensureCreditsLoaded, setBalance: setCreditBalance } = useMyCredits()

// En paralelo, no en serie — dos consultas independientes.
await Promise.all([ensureLoaded(), ensureCreditsLoaded()])

const post = computed(() => posts.value.find((p) => p.id === route.params.id))

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada' })
}

useHead({ title: post.value.title })

const title = ref(post.value.title)
const caption = ref(post.value.caption)
const dirty = computed(() => title.value !== post.value?.title || caption.value !== post.value?.caption)
const saving = ref(false)

async function save() {
  if (!post.value) return
  saving.value = true
  try {
    await updatePost(post.value.id, { title: title.value, caption: caption.value })
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)
async function remove() {
  if (!post.value) return
  deleting.value = true
  try {
    await deletePost(post.value.id)
    router.push('/creator/timeline')
  } finally {
    deleting.value = false
  }
}

const statusFlow: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']
const nextStatus = computed(() => {
  if (!post.value) return null
  const idx = statusFlow.indexOf(post.value.status)
  return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null
})
async function advanceStatus() {
  if (post.value && nextStatus.value) await updatePost(post.value.id, { status: nextStatus.value })
}

// Motor de ML real (ver docs/3-ML-PIPELINE.md §3.5): modelo heurístico +
// sugerencias opcionales de un LLM gratuito, servido por /api/ml/predict,
// que SÍ persiste en `ml_predictions` (con service_role, el cliente no
// tiene permiso de escritura ahí — ver RLS).
const predicting = ref(false)
const predictError = ref('')
async function predict() {
  if (!post.value) return
  predicting.value = true
  predictError.value = ''
  try {
    const result = await $fetch('/api/ml/predict', { method: 'POST', body: { postId: post.value.id } })
    if (post.value) {
      post.value.successScore = result.successScore
      post.value.confidence = result.confidence
      post.value.suggestions = result.suggestions.length ? result.suggestions : undefined
    }
    setCreditBalance(result.creditsRemaining)
  } catch (err) {
    console.error('[creator/post/:id] fallo al predecir:', err)
    const statusCode = (err as { statusCode?: number; response?: { status?: number } })?.statusCode
      ?? (err as { response?: { status?: number } })?.response?.status
    predictError.value = statusCode === 402
      ? 'Sin créditos disponibles. Mejora tu plan para seguir prediciendo.'
      : 'No se ha podido predecir. Inténtalo de nuevo.'
  } finally {
    predicting.value = false
  }
}
</script>

<template>
  <AppShell v-if="post" role="creator" title="Editar publicación">
    <div class="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
      <div>
        <div
          class="relative h-40 rounded-[var(--radius-lg)] overflow-hidden flex items-center justify-center mb-6"
          :style="{ background: `linear-gradient(${post.cover.angle}deg, ${post.cover.from}, ${post.cover.to})` }"
        >
          <Icon :name="contentTypeMeta[post.contentType].icon" class="size-10 text-white/90" />
        </div>

        <div class="flex items-center gap-2.5 mb-6 flex-wrap">
          <StatusPill :status="post.status" />
          <span class="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-text-muted)]">
            <Icon :name="platformMeta[post.platform].icon" class="size-4" :style="{ color: platformMeta[post.platform].colorVar }" />
            {{ platformMeta[post.platform].label }}
          </span>
          <span class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ contentTypeMeta[post.contentType].label }}</span>
          <BaseButton v-if="nextStatus" variant="secondary" size="sm" icon="ph:arrow-right-bold" class="ml-auto" @click="advanceStatus">
            Mover a "{{ statusMeta[nextStatus].label }}"
          </BaseButton>
        </div>

        <div class="flex flex-col gap-4 mb-6">
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="post-title">Título interno</label>
            <input
              id="post-title" v-model="title" type="text"
              class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
            >
          </div>
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="post-caption">Caption</label>
            <textarea
              id="post-caption" v-model="caption" rows="4"
              class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
            />
          </div>
          <p v-if="post.hashtags.length" class="flex flex-wrap gap-1.5">
            <span v-for="tag in post.hashtags" :key="tag" class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ tag }}</span>
          </p>
        </div>

        <div class="flex gap-2.5">
          <BaseButton variant="danger" icon="ph:trash-fill" :icon-spin="deleting" :disabled="deleting" @click="remove">Eliminar</BaseButton>
          <BaseButton variant="primary" icon="ph:check-bold" class="flex-1" :icon-spin="saving" :disabled="!dirty || saving" @click="save">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </BaseButton>
        </div>
      </div>

      <section class="mt-6 lg:mt-0">
        <SuccessScoreCard
          v-if="post.successScore" :score="post.successScore" :confidence="post.confidence ?? 0.82"
          :suggestions="post.suggestions ?? suggestionsForDraft"
        />
        <BaseCard v-else radius="lg" padding="lg" class="flex items-center justify-between gap-4 lg:flex-col lg:items-start">
          <div>
            <p class="text-[0.9375rem] text-[var(--color-text)]">Todavía no has predicho el éxito de esta publicación</p>
            <p class="text-[0.8125rem] text-[var(--color-text-muted)] mt-0.5">
              {{ creditBalance === 0 ? 'Sin créditos — mejora tu plan para seguir prediciendo' : `Consume 1 crédito · te quedan ${creditBalance ?? '…'}` }}
            </p>
            <p v-if="predictError" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-1">{{ predictError }}</p>
          </div>
          <BaseButton
            variant="primary" icon="ph:sparkle-fill" :icon-spin="predicting" :disabled="predicting || creditBalance === 0"
            class="shrink-0 lg:w-full" @click="predict"
          >
            {{ predicting ? 'Analizando…' : 'Predecir' }}
          </BaseButton>
        </BaseCard>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { contentTypeMeta, statusMeta, relativeTime } from '~/utils/status'
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

// Historial de revisión (ver supabase/migrations/20261025140000_post_
// revision_notes.sql) — solo tiene algo que mostrar si el post está/estuvo
// ligado a una colaboración, pero se pide igual, sin condición: si no hay
// filas, `notesByPost[id]` simplemente queda como un array vacío.
const { notesByPost, ensureLoaded: ensureRevisionsLoaded, latestPendingChangeRequest } = usePostRevisions()
await ensureRevisionsLoaded(post.value.id)
const revisionNotes = computed(() => notesByPost.value[post.value!.id] ?? [])
// Vigente de verdad solo si el post sigue en producción — en cuanto se
// reenvía a revisión, deja de ser "lo pendiente", aunque la nota se quede
// en el historial para siempre.
const pendingChangeRequest = computed(() => (post.value?.status === 'in_production' ? latestPendingChangeRequest(post.value.id) : null))

const title = ref(post.value.title)
const caption = ref(post.value.caption)
const dueDate = ref(post.value.dueDate)
const dirty = computed(() => title.value !== post.value?.title || caption.value !== post.value?.caption || dueDate.value !== post.value?.dueDate)
const saving = ref(false)
const todayIso = new Date().toISOString().slice(0, 10)

async function save() {
  if (!post.value) return
  saving.value = true
  try {
    await updatePost(post.value.id, { title: title.value, caption: caption.value, dueDate: dueDate.value })
  } finally {
    saving.value = false
  }
}

const { confirm } = useConfirm()
const deleting = ref(false)
async function remove() {
  if (!post.value) return
  const ok = await confirm({
    title: `¿Borrar "${post.value.title}"?`,
    message: 'Se borrará permanentemente, junto con su predicción de éxito si la tenía.',
    confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
  })
  if (!ok) return
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
      post.value.aiEvaluated = result.aiEvaluated
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
        <CoverUploader
          :post-id="post.id" :media-url="post.mediaUrl" :cover="post.cover" :icon="contentTypeMeta[post.contentType].icon"
          class="mb-6" @update:media-url="(url) => { if (post) post.mediaUrl = url }"
        />

        <BaseCard v-if="pendingChangeRequest" radius="md" padding="md" class="flex items-start gap-3 mb-6 border-[var(--color-status-alert)]/30 bg-[var(--color-status-alert)]/[0.06]">
          <Icon name="ph:arrow-counter-clockwise-bold" class="size-5 text-[var(--color-status-alert)] shrink-0 mt-0.5" />
          <div class="min-w-0">
            <p class="text-[0.8125rem] font-medium text-[var(--color-text)]">{{ pendingChangeRequest.authorName }} ha pedido cambios</p>
            <p class="text-[0.875rem] text-[var(--color-text)] leading-relaxed mt-0.5">{{ pendingChangeRequest.comment }}</p>
          </div>
        </BaseCard>

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
          <div>
            <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="post-due-date">Fecha de entrega</label>
            <input
              id="post-due-date" v-model="dueDate" type="date" :min="todayIso"
              class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
            >
          </div>
          <p v-if="post.hashtags.length" class="flex flex-wrap gap-1.5">
            <span v-for="tag in post.hashtags" :key="tag" class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ tag }}</span>
          </p>
        </div>

        <div class="flex gap-2.5 mb-8">
          <BaseButton variant="danger" icon="ph:trash-fill" :icon-spin="deleting" :disabled="deleting" @click="remove">Eliminar</BaseButton>
          <BaseButton variant="primary" icon="ph:check-bold" class="flex-1" :icon-spin="saving" :disabled="!dirty || saving" @click="save">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </BaseButton>
        </div>

        <section v-if="revisionNotes.length">
          <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-3">Historial de revisión</h2>
          <div class="flex flex-col gap-2.5">
            <div
              v-for="note in revisionNotes" :key="note.id"
              class="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3"
            >
              <span
                class="flex items-center justify-center size-8 rounded-full shrink-0"
                :class="note.kind === 'approved' ? 'bg-[var(--color-status-published)]/12 text-[var(--color-status-published)]' : 'bg-[var(--color-status-alert)]/12 text-[var(--color-status-alert)]'"
              >
                <Icon :name="note.kind === 'approved' ? 'ph:check-bold' : 'ph:arrow-counter-clockwise-bold'" class="size-4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-[0.8125rem] text-[var(--color-text)]">
                  <span class="font-medium">{{ note.authorName }}</span>
                  {{ note.kind === 'approved' ? 'aprobó esta publicación' : 'pidió cambios' }}
                  <span class="text-[var(--color-text-faint)]">· {{ relativeTime(note.createdAt) }}</span>
                </p>
                <p v-if="note.comment" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mt-1">{{ note.comment }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="mt-6 lg:mt-0">
        <SuccessScoreCard
          v-if="post.successScore" :score="post.successScore" :ai-evaluated="post.aiEvaluated"
          :suggestions="post.suggestions ?? suggestionsForDraft" :generic-suggestions="!post.suggestions"
        />
        <BaseCard v-else radius="lg" padding="lg" class="flex items-center justify-between gap-4 lg:flex-col lg:items-start">
          <div>
            <p class="text-[0.9375rem] text-[var(--color-text)]">Todavía no has predicho el éxito de esta publicación</p>
            <p class="text-[0.8125rem] text-[var(--color-text-muted)] mt-0.5">
              <template v-if="creditBalance === 0">
                Sin créditos —
                <NuxtLink to="/creator/profile?tab=billing" class="text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] underline underline-offset-2">mejora tu plan</NuxtLink>
                para seguir prediciendo
              </template>
              <template v-else>Consume 1 crédito · te quedan {{ creditBalance ?? '…' }}</template>
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

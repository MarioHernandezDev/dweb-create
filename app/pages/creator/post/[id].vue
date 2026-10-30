<script setup lang="ts">
import { contentTypeMeta, statusMeta, relativeTime, isPostOverdue, overdueLabel, movingSkipsPartnerReview, creatorNextStepHint } from '~/utils/status'
import { platformMeta, suggestionsForDraft } from '~/utils/mock-data'
import { LABEL_COLORS } from '~/utils/labels'
import type { PostStatus } from '~/types'

const route = useRoute()
const router = useRouter()
const { posts, ensureLoaded } = useMyPosts()
const { requests: collabRequests, ensureLoaded: ensureCollabRequestsLoaded } = useCollabRequests()

// En paralelo, no en serie — consultas independientes.
await Promise.all([ensureLoaded(), ensureCollabRequestsLoaded()])

const post = computed(() => posts.value.find((p) => p.id === route.params.id))

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada' })
}

useHead({ title: post.value.title })

const {
  title, caption, dueDate, dirty, saving, save, deleting, remove,
  predicting, predictError, predict, creditBalance,
  labels, labelsPickerOpen, newLabelName, newLabelColor, attachedLabels, isLabelAttached, toggleLabel, createAndAttachLabel,
  checklistItems, checklistPct, newItemText, addItem, toggleItem, deleteItem,
  revisionNotes, pendingChangeRequest
} = usePostEditorPanel(post)

// A-R9: contexto real de las publicaciones ya medidas. Carga aparte y sin bloquear
// la página; si falla o no hay muestra suficiente simplemente no se muestra.
const historyContext = ref<{ sampleSize: number; medianViews: number; minViews: number; maxViews: number } | null>(null)
onMounted(async () => {
  if (!post.value) return
  try {
    const res = await $fetch<{ history: typeof historyContext.value }>('/api/ml/history-context', { query: { postId: post.value.id } })
    historyContext.value = res.history
  } catch {
    historyContext.value = null
  }
})

const todayIso = new Date().toISOString().slice(0, 10)

async function onRemove() {
  if (await remove()) router.push('/creator/timeline')
}

const statusFlow: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']
const nextStatus = computed(() => {
  if (!post.value) return null
  const idx = statusFlow.indexOf(post.value.status)
  return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null
})
const { updatePost } = useMyPosts()
const { confirm } = useConfirm()
async function advanceStatus() {
  if (!post.value || !nextStatus.value) return
  const p = post.value
  const next = nextStatus.value

  // Mismo aviso que PhaseBoard.vue al arrastrar — ver movingSkipsPartnerReview
  // en utils/status.ts. Aquí solo puede pasar al llegar a "scheduled" desde
  // "ready_for_review": es el único salto de este botón secuencial que
  // coincide con lo que debería hacer `approve_post`, no un update directo.
  if (p.collaborationId && movingSkipsPartnerReview(next, collabRequests.value.find((c) => c.id === p.collaborationId)?.status)) {
    const partnerName = collabRequests.value.find((c) => c.id === p.collaborationId)?.partnerName ?? 'el partner'
    const ok = await confirm({
      title: 'Vas a saltarte la revisión del partner',
      message: `Esta publicación pertenece a una colaboración activa con ${partnerName}. Normalmente es ${partnerName} quien la aprueba antes de pasar a "${statusMeta[next].label}". ¿Moverla igualmente sin su aprobación?`,
      confirmLabel: 'Mover igualmente'
    })
    if (!ok) return
  }

  await updatePost(p.id, { status: next })
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
          <span v-if="isPostOverdue(post)" class="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-[var(--color-status-alert)]">
            <Icon name="ph:warning-fill" class="size-4" />
            {{ overdueLabel(post.dueInDays) }}
          </span>
          <span class="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-text-muted)]">
            <Icon :name="platformMeta[post.platform].icon" class="size-4" :style="{ color: platformMeta[post.platform].colorVar }" />
            {{ platformMeta[post.platform].label }}
          </span>
          <span class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ contentTypeMeta[post.contentType].label }}</span>
          <BaseButton v-if="nextStatus" variant="secondary" size="sm" icon="ph:arrow-right-bold" class="ml-auto" @click="advanceStatus">
            Mover a "{{ statusMeta[nextStatus].label }}"
          </BaseButton>
        </div>

        <p class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mb-6 -mt-2">
          {{ creatorNextStepHint(post, !!pendingChangeRequest) }}
        </p>

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

        <!-- Etiquetas — antes solo existían desde el panel del Tablero, no desde esta página. -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[0.8125rem] font-medium text-[var(--color-text-muted)]">Etiquetas</span>
            <button type="button" class="text-[0.8125rem] font-medium text-[var(--color-primary-500)]" @click="labelsPickerOpen = !labelsPickerOpen">
              {{ labelsPickerOpen ? 'Cerrar' : '+ Añadir' }}
            </button>
          </div>

          <div v-if="attachedLabels.length" class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="l in attachedLabels" :key="l.id"
              class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 h-7 rounded-full text-[0.8125rem] font-medium text-white"
              :style="{ background: l.color }"
            >
              {{ l.name }}
              <button type="button" aria-label="Quitar etiqueta" class="size-4 flex items-center justify-center rounded-full hover:bg-black/20" @click="toggleLabel(l)">
                <Icon name="ph:x-bold" class="size-2.5" />
              </button>
            </span>
          </div>

          <div v-if="labelsPickerOpen" class="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)] p-2.5">
            <button
              v-for="l in labels" :key="l.id" type="button"
              class="w-full flex items-center gap-2.5 h-9 px-2 rounded-[var(--radius-xs)] hover:bg-[var(--color-ink-raised)]"
              @click="toggleLabel(l)"
            >
              <span class="size-3 rounded-full shrink-0" :style="{ background: l.color }" />
              <span class="flex-1 text-left text-[0.875rem] text-[var(--color-text)]">{{ l.name }}</span>
              <Icon v-if="isLabelAttached(l.id)" name="ph:check-bold" class="size-4 text-[var(--color-primary-500)]" />
            </button>
            <p v-if="!labels.length" class="text-[0.8125rem] text-[var(--color-text-faint)] px-2 py-1.5">Todavía no tienes ninguna etiqueta.</p>

            <div class="border-t border-[var(--color-hairline)] mt-2 pt-2.5">
              <div class="flex items-center gap-1.5 mb-2">
                <button
                  v-for="c in LABEL_COLORS" :key="c.hex" type="button" :aria-label="c.name"
                  class="size-5 rounded-full shrink-0 transition-transform"
                  :class="newLabelColor === c.hex && 'ring-2 ring-offset-2 ring-offset-[var(--color-ink-overlay)] ring-[var(--color-text)] scale-110'"
                  :style="{ background: c.hex }"
                  @click="newLabelColor = c.hex"
                />
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newLabelName" type="text" placeholder="Nueva etiqueta…"
                  class="flex-1 h-9 px-3 rounded-[var(--radius-xs)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
                  @keydown.enter.prevent="createAndAttachLabel"
                >
                <BaseButton size="sm" variant="secondary" :disabled="!newLabelName.trim()" @click="createAndAttachLabel">Crear</BaseButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Checklist — antes solo existía desde el panel del Tablero, no desde esta página. -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[0.8125rem] font-medium text-[var(--color-text-muted)]">
              Checklist{{ checklistItems.length ? ` · ${checklistItems.filter((i) => i.done).length}/${checklistItems.length}` : '' }}
            </span>
          </div>
          <div v-if="checklistItems.length" class="h-1.5 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden mb-2.5">
            <div class="h-full rounded-full bg-[var(--color-primary-500)] transition-[width]" :style="{ width: `${checklistPct}%` }" />
          </div>

          <div v-if="checklistItems.length" class="flex flex-col gap-1.5 mb-2.5">
            <div v-for="item in checklistItems" :key="item.id" class="flex items-center gap-2.5 group">
              <button
                type="button" class="size-5 rounded-[0.3rem] border flex items-center justify-center shrink-0"
                :class="item.done ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)]' : 'border-[var(--color-hairline-strong)]'"
                :aria-label="item.done ? 'Marcar como pendiente' : 'Marcar como hecho'"
                @click="toggleItem(item.id, !item.done)"
              >
                <Icon v-if="item.done" name="ph:check-bold" class="size-3 text-white" />
              </button>
              <span class="flex-1 text-[0.875rem]" :class="item.done ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'">{{ item.text }}</span>
              <button type="button" aria-label="Borrar elemento" class="size-6 flex items-center justify-center rounded-full text-[var(--color-text-faint)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-status-alert)]" @click="deleteItem(item.id)">
                <Icon name="ph:x-bold" class="size-3" />
              </button>
            </div>
          </div>

          <div class="flex gap-2">
            <input
              v-model="newItemText" type="text" placeholder="Añadir elemento…"
              class="flex-1 h-9 px-3 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
              @keydown.enter.prevent="addItem"
            >
            <BaseButton size="sm" variant="secondary" :disabled="!newItemText.trim()" @click="addItem">Añadir</BaseButton>
          </div>
        </div>

        <div class="flex gap-2.5 mb-8">
          <BaseButton variant="danger" icon="ph:trash-fill" :icon-spin="deleting" :disabled="deleting" @click="onRemove">Eliminar</BaseButton>
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
          :history="historyContext"
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

        <!-- A-R7: vínculo con el contenido real (solo YouTube e Instagram tienen conexión real) -->
        <PostExternalLinkCard v-if="post.platform === 'youtube' || post.platform === 'instagram'" :post-id="post.id" :platform="post.platform" class="mt-4" />
      </section>
    </div>
  </AppShell>
</template>

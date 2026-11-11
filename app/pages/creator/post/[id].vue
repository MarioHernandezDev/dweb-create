<script setup lang="ts">
import { contentTypeMeta, statusMeta, relativeTime, isPostOverdue, overdueLabel, creatorNextStepHint } from '~/utils/status'
import { platformMeta, suggestionsForDraft } from '~/utils/mock-data'
import { LABEL_COLORS } from '~/utils/labels'
import type { PostStatus } from '~/types'

const route = useRoute()
const { predictionsEnabled } = useLaunchMode()
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

// A dónde vuelve «Volver» (y tras borrar): de dónde se vino, para no perder el contexto.
const backTarget = computed(() => {
  switch (route.query.desde) {
    case 'lista': return { to: '/creator/timeline?vista=lista', label: 'Volver a la lista' }
    case 'colaboracion': return { to: '/creator/requests', label: 'Volver a colaboraciones' }
    default: return { to: '/creator/timeline', label: 'Volver al tablero' }
  }
})
// Proyecto = la colaboración a la que pertenece (o contenido propio).
const project = computed(() => {
  const id = post.value?.collaborationId
  if (!id) return null
  return { id, partnerName: collabRequests.value.find((c) => c.id === id)?.partnerName ?? 'Colaboración' }
})

async function onRemove() {
  if (await remove()) router.push(backTarget.value.to)
}

const statusFlow: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']
const nextStatus = computed(() => {
  if (!post.value) return null
  const idx = statusFlow.indexOf(post.value.status)
  return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null
})
const { changeStatus } = usePostActions()
useUnsavedChangesGuard(dirty, 'de la publicación')
// Mismo camino que el Tablero y la lista (usePostActions): si la publicación es de una colaboración
// activa y aún no tiene la aprobación de la marca, se ofrece enviarla a revisión.
async function advanceStatus() {
  if (!post.value || !nextStatus.value) return
  await changeStatus(post.value, nextStatus.value)
}
</script>

<template>
  <AppShell v-if="post" role="creator" title="Publicación" full-width>
    <div class="mb-6" data-post-header>
      <NuxtLink :to="backTarget.to" class="inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" data-back-link>
        <Icon name="ph:arrow-left-bold" class="size-3.5" /> {{ backTarget.label }}
      </NuxtLink>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 class="font-display text-[1.5rem] md:text-[1.875rem] leading-tight text-[var(--color-text)] break-words min-w-0" data-post-title>{{ post.title }}</h1>
        <NuxtLink
          v-if="project" to="/creator/requests"
          class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-primary-500)]/10 text-micro font-medium text-[var(--color-primary-500)] hover:bg-[var(--color-primary-500)]/15 transition-colors"
          data-project-chip
        >
          <Icon name="ph:handshake-fill" class="size-3.5" /> {{ project.partnerName }}
        </NuxtLink>
        <span v-else class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-ink-overlay)] text-micro font-medium text-[var(--color-text-muted)]" data-project-chip>
          <Icon name="ph:user-fill" class="size-3.5" /> Contenido propio
        </span>
      </div>
    </div>

    <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem] lg:gap-8 lg:items-start">
      <div>
        <CoverUploader
          :post-id="post.id" :media-url="post.mediaUrl" :cover="post.cover" :icon="contentTypeMeta[post.contentType].icon"
          class="mb-6" @update:media-url="(url) => { if (post) post.mediaUrl = url }"
        />

        <BaseCard v-if="pendingChangeRequest" radius="md" padding="md" class="flex items-start gap-3 mb-6 border-[var(--color-status-alert)]/30 bg-[var(--color-status-alert)]/[0.06]">
          <Icon name="ph:arrow-counter-clockwise-bold" class="size-5 text-[var(--color-status-alert)] shrink-0 mt-0.5" />
          <div class="min-w-0">
            <p class="text-sm font-medium text-[var(--color-text)]">{{ pendingChangeRequest.authorName }} ha pedido cambios</p>
            <p class="text-sm text-[var(--color-text)] leading-relaxed mt-0.5">{{ pendingChangeRequest.comment }}</p>
          </div>
        </BaseCard>

        <div class="flex items-center gap-2.5 mb-6 flex-wrap">
          <StatusPill :status="post.status" />
          <span v-if="isPostOverdue(post)" class="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-status-alert)]">
            <Icon name="ph:warning-fill" class="size-4" />
            {{ overdueLabel(post.dueInDays) }}
          </span>
          <span class="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <Icon :name="platformMeta[post.platform].icon" class="size-4" :style="{ color: platformMeta[post.platform].colorVar }" />
            {{ platformMeta[post.platform].label }}
          </span>
          <span class="text-sm text-[var(--color-text-faint)]">{{ contentTypeMeta[post.contentType].label }}</span>
          <BaseButton v-if="nextStatus" variant="secondary" size="sm" icon="ph:arrow-right-bold" class="ml-auto" @click="advanceStatus">
            Mover a "{{ statusMeta[nextStatus].label }}"
          </BaseButton>
        </div>

        <p class="text-sm text-[var(--color-text-muted)] leading-relaxed mb-6 -mt-2">
          {{ creatorNextStepHint(post, !!pendingChangeRequest) }}
        </p>

        <div class="flex flex-col gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="post-title">Título interno</label>
            <input
              id="post-title" v-model="title" type="text"
              class="input w-full h-11"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="post-caption">Caption</label>
            <textarea
              id="post-caption" v-model="caption" rows="4"
              class="textarea w-full resize-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="post-due-date">Fecha de entrega</label>
            <input
              id="post-due-date" v-model="dueDate" type="date" :min="todayIso"
              class="input w-full h-11"
            >
          </div>
          <p v-if="post.hashtags.length" class="flex flex-wrap gap-1.5">
            <span v-for="tag in post.hashtags" :key="tag" class="text-sm text-[var(--color-text-faint)]">{{ tag }}</span>
          </p>
        </div>

        <!-- Etiquetas — antes solo existían desde el panel del Tablero, no desde esta página. -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-medium text-[var(--color-text-muted)]">Etiquetas</span>
            <button type="button" class="text-sm font-medium text-[var(--color-primary-500)]" @click="labelsPickerOpen = !labelsPickerOpen">
              {{ labelsPickerOpen ? 'Cerrar' : '+ Añadir' }}
            </button>
          </div>

          <div v-if="attachedLabels.length" class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="l in attachedLabels" :key="l.id"
              class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 h-7 rounded-full text-sm font-medium text-white"
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
              <span class="flex-1 text-left text-sm text-[var(--color-text)]">{{ l.name }}</span>
              <Icon v-if="isLabelAttached(l.id)" name="ph:check-bold" class="size-4 text-[var(--color-primary-500)]" />
            </button>
            <p v-if="!labels.length" class="text-sm text-[var(--color-text-faint)] px-2 py-1.5">Todavía no tienes ninguna etiqueta.</p>

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
                  class="input flex-1 h-9"
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
            <span class="text-sm font-medium text-[var(--color-text-muted)]">
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
              <span class="flex-1 text-sm" :class="item.done ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'">{{ item.text }}</span>
              <button type="button" aria-label="Borrar elemento" class="size-6 flex items-center justify-center rounded-full text-[var(--color-text-faint)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-status-alert)]" @click="deleteItem(item.id)">
                <Icon name="ph:x-bold" class="size-3" />
              </button>
            </div>
          </div>

          <div class="flex gap-2">
            <input
              v-model="newItemText" type="text" placeholder="Añadir elemento…"
              class="input flex-1 h-9"
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
          <h2 class="text-sm font-semibold text-[var(--text-muted)] mb-3">Historial de revisión</h2>
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
                <p class="text-sm text-[var(--color-text)]">
                  <span class="font-medium">{{ note.authorName }}</span>
                  {{ note.kind === 'approved' ? 'aprobó esta publicación' : 'pidió cambios' }}
                  <span class="text-[var(--color-text-faint)]">· {{ relativeTime(note.createdAt) }}</span>
                </p>
                <p v-if="note.comment" class="text-sm text-[var(--color-text-muted)] leading-relaxed mt-1">{{ note.comment }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="mt-6 lg:mt-0">
        <template v-if="predictionsEnabled">
        <SuccessScoreCard
          v-if="post.successScore" :score="post.successScore" :ai-evaluated="post.aiEvaluated"
          :suggestions="post.suggestions ?? suggestionsForDraft" :generic-suggestions="!post.suggestions"
          :history="historyContext"
        />
        <BaseCard v-else radius="lg" padding="lg" class="flex items-center justify-between gap-4 lg:flex-col lg:items-start">
          <div>
            <p class="text-base text-[var(--color-text)]">Todavía no has predicho el éxito de esta publicación</p>
            <p class="text-sm text-[var(--color-text-muted)] mt-0.5">
              <template v-if="creditBalance === 0">
                Sin créditos —
                <NuxtLink to="/creator/profile?tab=billing" class="text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] underline underline-offset-2">mejora tu plan</NuxtLink>
                para seguir prediciendo
              </template>
              <template v-else>Consume 1 crédito · te quedan {{ creditBalance ?? '…' }}</template>
            </p>
            <p v-if="predictError" class="text-sm text-[var(--color-status-alert)] mt-1">{{ predictError }}</p>
          </div>
          <BaseButton
            variant="primary" icon="ph:sparkle-fill" :icon-spin="predicting" :disabled="predicting || creditBalance === 0"
            class="shrink-0 lg:w-full" @click="predict"
          >
            {{ predicting ? 'Analizando…' : 'Predecir' }}
          </BaseButton>
        </BaseCard>
        </template>

        <!-- A-R7: vínculo con el contenido real (solo YouTube e Instagram tienen conexión real) -->
        <PostExternalLinkCard v-if="post.platform === 'youtube' || post.platform === 'instagram'" :post-id="post.id" :platform="post.platform" class="mt-4" />
      </section>
    </div>
  </AppShell>
</template>

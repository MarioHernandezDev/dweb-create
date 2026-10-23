<script setup lang="ts">
import { contentTypeMeta, statusMeta } from '~/utils/status'
import { platformMeta, suggestionsForDraft } from '~/utils/mock-data'
import { LABEL_COLORS } from '~/utils/labels'
import type { ChecklistItem } from '~/composables/useChecklist'
import type { Label } from '~/composables/useLabels'
import type { Post, PostStatus } from '~/types'

const props = defineProps<{ modelValue: boolean; post: Post | null; phases: PostStatus[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; move: [status: PostStatus] }>()

const { updatePost, deletePost } = useMyPosts()
const { balance: creditBalance, ensureLoaded: ensureCreditsLoaded, setBalance: setCreditBalance } = useMyCredits()
const { labels, ensureLabels, createLabel, attachLabel, detachLabel } = useLabels()
const { itemsByPost, ensureItems, addItem: addChecklistItem, toggleItem, deleteItem } = useChecklist()
const { confirm } = useConfirm()

const title = ref('')
const caption = ref('')
const dueDate = ref('')
const todayIso = new Date().toISOString().slice(0, 10)

// Se resetea cada vez que se abre con una card distinta — el panel es uno
// solo, reutilizado para cualquier post que se abra desde el tablero.
watch(
  () => [props.modelValue, props.post?.id] as const,
  ([open]) => {
    if (!open || !props.post) return
    title.value = props.post.title
    caption.value = props.post.caption
    dueDate.value = props.post.dueDate
    predictError.value = ''
    labelsPickerOpen.value = false
    newLabelName.value = ''
    newLabelColor.value = LABEL_COLORS[0].hex
    newItemText.value = ''
    ensureCreditsLoaded()
    ensureLabels()
    ensureItems(props.post.id)
  },
  { immediate: true }
)

const dirty = computed(
  () => !!props.post && (title.value !== props.post.title || caption.value !== props.post.caption || dueDate.value !== props.post.dueDate)
)
const saving = ref(false)
async function save() {
  if (!props.post) return
  saving.value = true
  try {
    await updatePost(props.post.id, { title: title.value, caption: caption.value, dueDate: dueDate.value })
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)
async function remove() {
  if (!props.post) return
  const ok = await confirm({
    title: `¿Borrar "${props.post.title}"?`,
    message: 'Se borrará permanentemente, junto con su checklist, etiquetas y predicción de éxito si las tenía.',
    confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
  })
  if (!ok) return
  deleting.value = true
  try {
    await deletePost(props.post.id)
    emit('update:modelValue', false)
  } finally {
    deleting.value = false
  }
}

function onStatusChange(event: Event) {
  emit('move', (event.target as HTMLSelectElement).value as PostStatus)
}

// Motor de ML real (ver docs/3-ML-PIPELINE.md §3.5).
const predicting = ref(false)
const predictError = ref('')
async function predict() {
  if (!props.post) return
  predicting.value = true
  predictError.value = ''
  try {
    const result = await $fetch('/api/ml/predict', { method: 'POST', body: { postId: props.post.id } })
    if (props.post) {
      props.post.successScore = result.successScore
      props.post.aiEvaluated = result.aiEvaluated
      props.post.suggestions = result.suggestions.length ? result.suggestions : undefined
    }
    setCreditBalance(result.creditsRemaining)
  } catch (err) {
    console.error('[PostEditSheet] fallo al predecir:', err)
    const statusCode = (err as { statusCode?: number; response?: { status?: number } })?.statusCode
      ?? (err as { response?: { status?: number } })?.response?.status
    predictError.value = statusCode === 402
      ? 'Sin créditos disponibles. Mejora tu plan para seguir prediciendo.'
      : 'No se ha podido predecir. Inténtalo de nuevo.'
  } finally {
    predicting.value = false
  }
}

// Etiquetas
const labelsPickerOpen = ref(false)
const newLabelName = ref('')
const newLabelColor = ref(LABEL_COLORS[0].hex)
const attachedLabels = computed(() => {
  if (!props.post) return []
  const ids = props.post.labelIds
  return labels.value.filter((l) => ids.includes(l.id))
})
function isAttached(labelId: string) {
  return !!props.post?.labelIds.includes(labelId)
}
async function toggleLabel(label: Label) {
  if (!props.post) return
  if (isAttached(label.id)) await detachLabel(props.post.id, label.id, props.post)
  else await attachLabel(props.post.id, label.id, props.post)
}
async function createAndAttachLabel() {
  const name = newLabelName.value.trim()
  if (!name || !props.post) return
  const created = await createLabel(name, newLabelColor.value)
  await attachLabel(props.post.id, created.id, props.post)
  newLabelName.value = ''
}

// Checklist
const checklistItems = computed<ChecklistItem[]>(() => (props.post ? itemsByPost.value[props.post.id] ?? [] : []))
const checklistPct = computed(() => {
  const total = checklistItems.value.length
  if (!total) return 0
  return Math.round((checklistItems.value.filter((i) => i.done).length / total) * 100)
})
const newItemText = ref('')
async function onAddItem() {
  const text = newItemText.value.trim()
  if (!text || !props.post) return
  await addChecklistItem(props.post.id, text, props.post)
  newItemText.value = ''
}
</script>

<template>
  <BottomSheet :model-value="modelValue" :title="post?.title ?? 'Publicación'" @update:model-value="$emit('update:modelValue', $event)">
    <template v-if="post">
      <CoverUploader
        :post-id="post.id" :media-url="post.mediaUrl" :cover="post.cover" :icon="contentTypeMeta[post.contentType].icon"
        class="mb-5" @update:media-url="(url) => { if (post) post.mediaUrl = url }"
      />

      <div class="flex items-center gap-2.5 mb-4 flex-wrap">
        <span class="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-text-muted)]">
          <Icon :name="platformMeta[post.platform].icon" class="size-4" :style="{ color: platformMeta[post.platform].colorVar }" />
          {{ platformMeta[post.platform].label }}
        </span>
        <span class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ contentTypeMeta[post.contentType].label }}</span>

        <select
          class="ml-auto h-9 px-2.5 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium text-white"
          :style="{ background: statusMeta[post.status].color }"
          :value="post.status" aria-label="Cambiar de fase"
          @change="onStatusChange"
        >
          <option v-for="p in phases" :key="p" :value="p" class="bg-[var(--color-ink-raised)] text-[var(--color-text)]">
            {{ statusMeta[p].label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-4 mb-5">
        <div>
          <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pes-title">Título interno</label>
          <input
            id="pes-title" v-model="title" type="text"
            class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
          >
        </div>
        <div>
          <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pes-caption">Caption</label>
          <textarea
            id="pes-caption" v-model="caption" rows="3"
            class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
          />
        </div>
        <div>
          <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="pes-due-date">Fecha de entrega</label>
          <input
            id="pes-due-date" v-model="dueDate" type="date" :min="todayIso"
            class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
          >
        </div>
        <p v-if="post.hashtags.length" class="flex flex-wrap gap-1.5">
          <span v-for="tag in post.hashtags" :key="tag" class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ tag }}</span>
        </p>
      </div>

      <!-- Etiquetas -->
      <div class="mb-5">
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
            <Icon v-if="isAttached(l.id)" name="ph:check-bold" class="size-4 text-[var(--color-primary-500)]" />
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

      <!-- Checklist -->
      <div class="mb-5">
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
              @click="toggleItem(post.id, item.id, !item.done, post)"
            >
              <Icon v-if="item.done" name="ph:check-bold" class="size-3 text-white" />
            </button>
            <span class="flex-1 text-[0.875rem]" :class="item.done ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'">{{ item.text }}</span>
            <button type="button" aria-label="Borrar elemento" class="size-6 flex items-center justify-center rounded-full text-[var(--color-text-faint)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-status-alert)]" @click="deleteItem(post.id, item.id, post)">
              <Icon name="ph:x-bold" class="size-3" />
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <input
            v-model="newItemText" type="text" placeholder="Añadir elemento…"
            class="flex-1 h-9 px-3 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
            @keydown.enter.prevent="onAddItem"
          >
          <BaseButton size="sm" variant="secondary" :disabled="!newItemText.trim()" @click="onAddItem">Añadir</BaseButton>
        </div>
      </div>

      <SuccessScoreCard
        v-if="post.successScore" :score="post.successScore" :ai-evaluated="post.aiEvaluated"
        :suggestions="post.suggestions ?? suggestionsForDraft" :generic-suggestions="!post.suggestions" class="mb-5"
      />
      <BaseCard v-else radius="lg" padding="lg" class="flex items-center justify-between gap-4 mb-5">
        <div>
          <p class="text-[0.9375rem] text-[var(--color-text)]">Todavía no has predicho el éxito</p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)] mt-0.5">
            <template v-if="creditBalance === 0">
              Sin créditos —
              <NuxtLink to="/creator/profile?tab=billing" class="text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] underline underline-offset-2">mejora tu plan</NuxtLink>
            </template>
            <template v-else>1 crédito · quedan {{ creditBalance ?? '…' }}</template>
          </p>
          <p v-if="predictError" class="text-[0.8125rem] text-[var(--color-status-alert)] mt-1">{{ predictError }}</p>
        </div>
        <BaseButton
          variant="primary" icon="ph:sparkle-fill" :icon-spin="predicting" :disabled="predicting || creditBalance === 0"
          class="shrink-0" @click="predict"
        >
          {{ predicting ? 'Analizando…' : 'Predecir' }}
        </BaseButton>
      </BaseCard>

      <div class="flex gap-2.5">
        <BaseButton variant="danger" icon="ph:trash-fill" :icon-spin="deleting" :disabled="deleting" @click="remove">Eliminar</BaseButton>
        <BaseButton variant="primary" icon="ph:check-bold" class="flex-1" :icon-spin="saving" :disabled="!dirty || saving" @click="save">
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>

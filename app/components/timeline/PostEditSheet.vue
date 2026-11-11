<script setup lang="ts">
import { contentTypeMeta, statusMeta, isPostOverdue, overdueLabel, relativeTime, creatorNextStepHint } from '~/utils/status'
import { platformMeta, suggestionsForDraft } from '~/utils/mock-data'
import { LABEL_COLORS } from '~/utils/labels'
import type { Post, PostStatus } from '~/types'

const { paymentsEnabled } = useLaunchMode()

const props = defineProps<{ modelValue: boolean; post: Post | null; phases: PostStatus[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; move: [status: PostStatus] }>()

const postRef = computed(() => props.post)
const {
  title, caption, dueDate, dirty, saving, save, deleting, remove,
  predicting, predictError, predict, creditBalance,
  labels, labelsPickerOpen, newLabelName, newLabelColor, attachedLabels, isLabelAttached, toggleLabel, createAndAttachLabel,
  checklistItems, checklistPct, newItemText, addItem, toggleItem, deleteItem,
  revisionNotes, pendingChangeRequest
} = usePostEditorPanel(postRef)

function onStatusChange(event: Event) {
  emit('move', (event.target as HTMLSelectElement).value as PostStatus)
}

async function onRemove() {
  if (await remove()) emit('update:modelValue', false)
}

useUnsavedChangesGuard(dirty, 'de la publicación')

// Cerrar el panel con cambios sin guardar pide confirmación (antes se
// descartaban en silencio).
const { confirm } = useConfirm()
async function onVisibility(open: boolean) {
  if (!open && dirty.value) {
    const ok = await confirm({
      title: 'Tienes cambios sin guardar',
      message: 'Si cierras ahora se perderán los cambios que no hayas guardado todavía.',
      confirmLabel: 'Cerrar sin guardar', cancelLabel: 'Seguir editando', tone: 'danger'
    })
    if (!ok) return
  }
  emit('update:modelValue', open)
}
</script>

<template>
  <BottomSheet :model-value="modelValue" :title="post?.title ?? 'Publicación'" @update:model-value="onVisibility">
    <template v-if="post">
      <NuxtLink
        :to="`/creator/post/${post.id}?desde=tablero`" class="inline-flex items-center gap-1.5 min-h-11 mb-2 text-sm font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]"
        data-open-full-page
      >
        <Icon name="ph:arrow-square-out-bold" class="size-3.5" /> Abrir página completa
      </NuxtLink>
      <CoverUploader
        :post-id="post.id" :media-url="post.mediaUrl" :cover="post.cover" :icon="contentTypeMeta[post.contentType].icon"
        class="mb-5" @update:media-url="(url) => { if (post) post.mediaUrl = url }"
      />

      <BaseCard v-if="pendingChangeRequest" radius="md" padding="md" class="flex items-start gap-3 mb-5 border-[var(--color-status-alert)]/30 bg-[var(--color-status-alert)]/[0.06]">
        <Icon name="ph:arrow-counter-clockwise-bold" class="size-5 text-[var(--color-status-alert)] shrink-0 mt-0.5" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-[var(--color-text)]">{{ pendingChangeRequest.authorName }} ha pedido cambios</p>
          <p class="text-sm text-[var(--color-text)] leading-relaxed mt-0.5">{{ pendingChangeRequest.comment }}</p>
        </div>
      </BaseCard>

      <div class="flex items-center gap-2.5 mb-4 flex-wrap">
        <span v-if="isPostOverdue(post)" class="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-status-alert)]">
          <Icon name="ph:warning-fill" class="size-4" />
          {{ overdueLabel(post.dueInDays) }}
        </span>
        <span class="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
          <Icon :name="platformMeta[post.platform].icon" class="size-4" :style="{ color: platformMeta[post.platform].colorVar }" />
          {{ platformMeta[post.platform].label }}
        </span>
        <span class="text-sm text-[var(--color-text-faint)]">{{ contentTypeMeta[post.contentType].label }}</span>

        <select
          class="ml-auto h-9 px-2.5 rounded-[var(--radius-xs)] text-sm font-medium text-white"
          :style="{ background: statusMeta[post.status].color }"
          :value="post.status" aria-label="Cambiar de fase"
          @change="onStatusChange"
        >
          <option v-for="p in phases" :key="p" :value="p" class="bg-[var(--color-ink-raised)] text-[var(--color-text)]">
            {{ statusMeta[p].label }}
          </option>
        </select>
      </div>

      <p class="text-sm text-[var(--color-text-muted)] leading-relaxed mb-5 -mt-1">
        {{ creatorNextStepHint(post, !!pendingChangeRequest) }}
      </p>

      <div class="flex flex-col gap-4 mb-5">
        <div>
          <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="pes-title">Título interno</label>
          <input
            id="pes-title" v-model="title" type="text"
            class="input w-full h-11"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="pes-caption">Caption</label>
          <textarea
            id="pes-caption" v-model="caption" rows="3"
            class="textarea w-full resize-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="pes-due-date">Fecha de entrega</label>
          <input
            id="pes-due-date" v-model="dueDate" type="date"
            class="input w-full h-11"
          >
        </div>
        <p v-if="post.hashtags.length" class="flex flex-wrap gap-1.5">
          <span v-for="tag in post.hashtags" :key="tag" class="text-sm text-[var(--color-text-faint)]">{{ tag }}</span>
        </p>
      </div>

      <!-- Etiquetas -->
      <div class="mb-5">
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

      <!-- Checklist -->
      <div class="mb-5">
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

      <SuccessScoreCard
        v-if="post.successScore" :score="post.successScore" :ai-evaluated="post.aiEvaluated"
        :suggestions="post.suggestions ?? suggestionsForDraft" :generic-suggestions="!post.suggestions" class="mb-5"
      />
      <BaseCard v-else radius="lg" padding="lg" class="flex items-center justify-between gap-4 mb-5">
        <div>
          <p class="text-base text-[var(--color-text)]">Todavía no has predicho el éxito</p>
          <p class="text-sm text-[var(--color-text-muted)] mt-0.5">
            <template v-if="creditBalance === 0 && !paymentsEnabled">Sin créditos: durante el lanzamiento no se pueden ampliar.</template>
            <template v-else-if="creditBalance === 0">
              Sin créditos —
              <NuxtLink to="/creator/profile?tab=billing" class="text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] underline underline-offset-2">mejora tu plan</NuxtLink>
            </template>
            <template v-else>1 crédito · quedan {{ creditBalance ?? '…' }}</template>
          </p>
          <p v-if="predictError" class="text-sm text-[var(--color-status-alert)] mt-1">{{ predictError }}</p>
        </div>
        <BaseButton
          variant="primary" icon="ph:sparkle-fill" :icon-spin="predicting" :disabled="predicting || creditBalance === 0"
          class="shrink-0" @click="predict"
        >
          {{ predicting ? 'Analizando…' : 'Predecir' }}
        </BaseButton>
      </BaseCard>

      <section v-if="revisionNotes.length" class="mb-5">
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

      <div class="flex gap-2.5">
        <BaseButton variant="danger" icon="ph:trash-fill" :icon-spin="deleting" :disabled="deleting" @click="onRemove">Eliminar</BaseButton>
        <BaseButton variant="primary" icon="ph:check-bold" class="flex-1" :icon-spin="saving" :disabled="!dirty || saving" @click="save">
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>

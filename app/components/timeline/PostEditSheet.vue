<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { contentTypeMeta, isPostOverdue, overdueLabel } from '~/utils/status'
import { platformMeta, suggestionsForDraft } from '~/utils/mock-data'
import type { Post, PostStatus } from '~/types'

const { predictionsEnabled } = useLaunchMode()

// `phases` ya no hace falta (el recorrido sale de `usePostFlow`); se acepta por compatibilidad con quien abre la ficha.
const props = defineProps<{ modelValue: boolean; post: Post | null; phases?: PostStatus[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; move: [status: PostStatus] }>()

const postRef = computed(() => props.post)
const {
  title, caption, dueDate, hashtagsText, parsedHashtags, dirty, discard, saving, deleting, remove,
  saved, saveWithFeedback, titleError, captionMax, captionLength, captionError, blockedReason, copied, copyText,
  statusFlow, nextStatus, prevStatus, waitingForPartner, advanceLabel,
  predicting, predictError, predict, creditBalance,
  labels, labelsPickerOpen, newLabelName, newLabelColor, attachedLabels, isLabelAttached, toggleLabel, createAndAttachLabel,
  checklistItems, checklistPct, newItemText, addItem, toggleItem, deleteItem,
  revisionNotes, pendingChangeRequest
} = usePostEditorPanel(postRef)

// El tablero decide cómo reflejar el cambio de fase (mueve la tarjeta de columna): aquí solo se avisa.
const moving = ref(false)
function onMove(status: PostStatus) {
  moving.value = true
  emit('move', status)
  // El resultado (éxito, cancelación o error) lo notifica el tablero con su aviso; la ficha vuelve a estar libre enseguida.
  setTimeout(() => { moving.value = false }, 600)
}

async function onRemove() {
  if (await remove()) emit('update:modelValue', false)
}

useUnsavedChangesGuard(dirty, 'de la publicación')
useEventListener('keydown', (e: KeyboardEvent) => {
  if (props.modelValue && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveWithFeedback() }
})

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
  <BottomSheet :model-value="modelValue" :title="post?.title ?? 'Publicación'" wide @update:model-value="onVisibility">
    <div v-if="post" class="pdetail pdetail--sheet">
      <p class="pdetail__meta !mt-0">
        <PhaseChip :status="post.status" />
        <span>
          <Icon :name="platformMeta[post.platform].icon" class="size-4" />
          {{ [post.platform, ...(post.extraPlatforms ?? [])].map((p) => platformMeta[p].label).join(' + ') }} · {{ contentTypeMeta[post.contentType].label }}
        </span>
        <span v-if="post.collaborationId"><Icon name="ph:handshake-fill" class="size-4" /> Colaboración</span>
        <span v-else><Icon name="ph:user-fill" class="size-4" /> Contenido propio</span>
        <span v-if="isPostOverdue(post)" class="pdetail__overdue">
          <Icon name="ph:warning-fill" class="size-4" /> {{ overdueLabel(post.dueInDays) }}
        </span>
        <NuxtLink :to="`/creator/post/${post.id}?desde=tablero`" class="pdetail__project ml-auto" data-open-full-page>
          <Icon name="ph:arrow-square-out-bold" class="size-4" /> Abrir página completa
        </NuxtLink>
      </p>

      <PostPhaseStepper :flow="statusFlow" :status="post.status" />
      <PostNextStep
        :post="post" :pending-change="pendingChangeRequest" :prev-status="prevStatus" :next-status="nextStatus"
        :advance-label="advanceLabel" :waiting-for-partner="waitingForPartner" :moving="moving" @move="onMove"
      />

      <div class="pdetail__grid pdetail__grid--sheet">
        <div class="pdetail__col">
          <section class="psection">
            <div class="pcontent">
              <CoverUploader
                :post-id="post.id" :media-url="post.mediaUrl" :cover="post.cover" :icon="contentTypeMeta[post.contentType].icon"
                @update:media-url="(url) => { if (post) post.mediaUrl = url }"
              />
              <PostContentFields
                v-model:title="title" v-model:caption="caption" v-model:hashtags="hashtagsText" :rows="4"
                :title-error="titleError" :caption-error="captionError" :caption-length="captionLength" :caption-max="captionMax"
                :parsed-hashtags="parsedHashtags" :copied="copied" :can-copy="!!caption.trim() || !!parsedHashtags.length" @copy="copyText"
              />
            </div>
          </section>

          <section v-if="revisionNotes.length" class="psection">
            <h3 class="psection__title">Historial de revisión</h3>
            <PostRevisionHistory :notes="revisionNotes" />
          </section>
        </div>

        <div class="pdetail__col">
          <section class="psection">
            <h3 class="psection__title">Planificación</h3>
            <BaseField v-slot="f" label="Fecha de entrega">
              <DatePicker v-bind="f" v-model="dueDate" />
            </BaseField>
          </section>

          <section class="psection">
            <h3 class="psection__title">Checklist<span v-if="checklistItems.length"> · {{ checklistItems.filter((i) => i.done).length }}/{{ checklistItems.length }}</span></h3>
            <PostChecklistPanel v-model:new-text="newItemText" :items="checklistItems" :pct="checklistPct" @toggle="toggleItem" @remove="deleteItem" @add="addItem" />
          </section>

          <section class="psection">
            <h3 class="psection__title">Etiquetas</h3>
            <PostLabelsPanel
              v-model:open="labelsPickerOpen" v-model:new-name="newLabelName" v-model:new-color="newLabelColor"
              :labels="labels" :attached="attachedLabels" :is-attached="isLabelAttached" @toggle="toggleLabel" @create="createAndAttachLabel"
            />
          </section>

          <template v-if="predictionsEnabled">
            <SuccessScoreCard
              v-if="post.successScore" :score="post.successScore" :ai-evaluated="post.aiEvaluated"
              :suggestions="post.suggestions ?? suggestionsForDraft" :generic-suggestions="!post.suggestions"
            />
            <section v-else class="psection">
              <h3 class="psection__title">Predicción de éxito</h3>
              <p class="pdetail__empty">
                <template v-if="creditBalance === 0">Sin créditos: durante el lanzamiento no se pueden ampliar.</template>
                <template v-else>Consume 1 crédito · te quedan {{ creditBalance ?? '…' }}.</template>
              </p>
              <p v-if="predictError" class="field__error mb-3">{{ predictError }}</p>
              <BaseButton variant="secondary" size="sm" :loading="predicting" :disabled="predicting || creditBalance === 0" @click="predict">
                {{ predicting ? 'Analizando…' : 'Predecir' }}
              </BaseButton>
            </section>
          </template>
        </div>
      </div>

      <div class="pdetail__danger">
        <span>Borrarla es definitivo.</span>
        <BaseButton variant="danger" size="sm" icon="ph:trash-fill" :loading="deleting" :disabled="deleting" @click="onRemove">Eliminar publicación</BaseButton>
      </div>

      <ProfileSaveBar sheet :dirty="dirty" :saving="saving" :saved="saved" :blocked-reason="blockedReason" @save="saveWithFeedback" @discard="discard" />
    </div>
  </BottomSheet>
</template>

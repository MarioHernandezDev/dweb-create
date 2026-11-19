<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { contentTypeMeta, isPostOverdue, overdueLabel } from '~/utils/status'
import { linkHost } from '~/utils/delivery-links'
import { duplicateDueDate, duplicateTitle, postTemplateFrom } from '~/utils/post-templates'
import { errorMessage } from '~/utils/error-message'
import { platformMeta, suggestionsForDraft } from '~/utils/mock-data'
import type { PostStatus } from '~/types'

const route = useRoute()
const { predictionsEnabled } = useLaunchMode()
const router = useRouter()
const { posts, ensureLoaded, createPost } = useMyPosts()
const toast = useToast()
const { requests: collabRequests, ensureLoaded: ensureCollabRequestsLoaded } = useCollabRequests()

// En paralelo, no en serie — consultas independientes.
await Promise.all([ensureLoaded(), ensureCollabRequestsLoaded()])

const post = computed(() => posts.value.find((p) => p.id === route.params.id))

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada' })
}

useHead({ title: post.value.title })

const {
  title, caption, dueDate, hashtagsText, parsedHashtags, draftUrl, resultUrl, draftUrlError, resultUrlError, dirty, discard, saving, deleting, remove,
  saved, saveWithFeedback, titleError, captionMax, captionLength, captionError, blockedReason, copied, copyText,
  statusFlow, stepIndex, nextStatus, prevStatus, waitingForPartner, advanceLabel,
  predicting, predictError, predict, creditBalance,
  labels, labelsPickerOpen, newLabelName, newLabelColor, attachedLabels, isLabelAttached, toggleLabel, createAndAttachLabel,
  checklistItems, checklistPct, newItemText, addItem, toggleItem, deleteItem,
  revisionNotes, pendingChangeRequest
} = usePostEditorPanel(post)

// Reutilizar: duplicar la publicación (con su checklist, sin marcar) o guardar su estructura como plantilla.
const { addItem: addChecklistItem } = useChecklist()
const duplicating = ref(false)
async function duplicate() {
  const p = post.value
  if (!p || duplicating.value) return
  duplicating.value = true
  try {
    const copy = await createPost({
      title: duplicateTitle(p.title), caption: p.caption, contentType: p.contentType, platform: p.platform,
      extraPlatforms: p.extraPlatforms ?? [], hashtags: p.hashtags, collaborationId: p.collaborationId ?? null, dueDate: duplicateDueDate(p.dueDate)
    })
    let tasksFailed = false
    try {
      for (const item of checklistItems.value) await addChecklistItem(copy.id, item.text)
    } catch { tasksFailed = true }
    if (tasksFailed) toast.error('Copia creada, pero no se han podido copiar todas las tareas del checklist.')
    else toast.success('Publicación duplicada: la copia está en «Idea», con su fecha una semana después.')
    await router.push(`/creator/post/${copy.id}`)
  } catch (e) {
    toast.error(errorMessage(e, 'No se ha podido duplicar la publicación. Inténtalo de nuevo.'))
  } finally {
    duplicating.value = false
  }
}

const { save: saveTemplate, load: loadTemplates } = useProposalTemplates('post')
onMounted(() => loadTemplates())
const naming = ref(false)
const templateName = ref('')
const templateBusy = ref(false)
const templateError = ref('')
function startTemplate() { naming.value = true; templateName.value = post.value?.title ?? ''; templateError.value = '' }
async function saveAsTemplate() {
  const p = post.value
  if (!p || templateBusy.value) return
  templateBusy.value = true
  templateError.value = ''
  try {
    const result = await saveTemplate(templateName.value, postTemplateFrom(p, checklistItems.value.map((i) => i.text)))
    toast.success(result === 'updated' ? 'Plantilla actualizada' : 'Plantilla guardada: la tienes en «Nueva publicación»')
    naming.value = false
  } catch (e) {
    templateError.value = errorMessage(e, 'No se ha podido guardar la plantilla.')
  } finally {
    templateBusy.value = false
  }
}

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
  const c = collabRequests.value.find((r) => r.id === id)
  return { id, partnerName: c?.partnerName ?? 'Colaboración', campaignName: c?.campaignName?.trim() || null }
})

async function onRemove() {
  if (await remove()) router.push(backTarget.value.to)
}

const { changeStatus } = usePostActions()
useUnsavedChangesGuard(dirty, 'de la publicación')
const moving = ref(false)
// Mismo camino que el Tablero y la lista (usePostActions): si la publicación es de una colaboración
// activa y aún no tiene la aprobación de la marca, se ofrece enviarla a revisión.
async function moveTo(status: PostStatus) {
  if (!post.value || moving.value) return
  moving.value = true
  try { await changeStatus(post.value, status) } finally { moving.value = false }
}

useEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveWithFeedback() }
})

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' })
const fmt = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : null)
const doneCount = computed(() => checklistItems.value.filter((i) => i.done).length)
</script>

<template>
  <AppShell v-if="post" role="creator" title="Publicación" full-width>
    <div class="pdetail">
      <header data-post-header>
        <NuxtLink :to="backTarget.to" class="pdetail__back" data-back-link>
          <Icon name="ph:arrow-left-bold" class="size-3.5" /> {{ backTarget.label }}
        </NuxtLink>
        <div class="pdetail__titlerow">
          <h1 class="pdetail__title" data-post-title>{{ title.trim() || post.title }}</h1>
          <PhaseChip :status="post.status" />
        </div>
        <p class="pdetail__meta">
          <span>
            <Icon :name="platformMeta[post.platform].icon" class="size-4" />
            {{ [post.platform, ...(post.extraPlatforms ?? [])].map((p) => platformMeta[p].label).join(' + ') }} · {{ contentTypeMeta[post.contentType].label }}
          </span>
          <NuxtLink v-if="project" :to="`/creator/collaborations/${project.id}`" class="pdetail__project" data-project-chip>
            <Icon name="ph:handshake-fill" class="size-4" /> {{ project.campaignName ? `${project.campaignName} · ${project.partnerName}` : `Colaboración con ${project.partnerName}` }}
          </NuxtLink>
          <span v-else data-project-chip><Icon name="ph:user-fill" class="size-4" /> Contenido propio</span>
          <span v-if="isPostOverdue(post)" class="pdetail__overdue">
            <Icon name="ph:warning-fill" class="size-4" /> {{ overdueLabel(post.dueInDays) }}
          </span>
        </p>
      </header>

      <PostPhaseStepper :flow="statusFlow" :status="post.status" />
      <PostNextStep
        :post="post" :pending-change="pendingChangeRequest" :prev-status="prevStatus" :next-status="nextStatus"
        :advance-label="advanceLabel" :waiting-for-partner="waitingForPartner" :moving="moving" @move="moveTo"
      />

      <div class="pdetail__grid">
        <div class="pdetail__col">
          <PanelCard title="Contenido" description="Lo que vas a publicar: el título te sirve para reconocerla en el tablero.">
            <PostContentFields
              v-model:title="title" v-model:caption="caption" v-model:hashtags="hashtagsText"
              :title-error="titleError" :caption-error="captionError" :caption-length="captionLength" :caption-max="captionMax"
              :parsed-hashtags="parsedHashtags" :copied="copied" :can-copy="!!caption.trim() || !!parsedHashtags.length" @copy="copyText"
            />
          </PanelCard>

          <PanelCard v-if="revisionNotes.length" title="Historial de revisión" description="Lo que ha dicho la marca sobre esta pieza.">
            <PostRevisionHistory :notes="revisionNotes" />
          </PanelCard>
        </div>

        <aside class="pdetail__col">
          <PanelCard title="Imagen" description="Se ve en el tablero y es lo que revisa la marca.">
            <CoverUploader
              :post-id="post.id" :media-url="post.mediaUrl" :cover="post.cover" :icon="contentTypeMeta[post.contentType].icon"
              @update:media-url="(url) => { if (post) post.mediaUrl = url }"
            />
          </PanelCard>

          <PanelCard title="Entrega" description="Enlaces para que la marca vea el borrador y, al final, el resultado.">
            <BaseField class="mb-4" data-delivery-links label="Enlace al borrador (opcional)" hint="Un vídeo o archivo pesado en Drive, WeTransfer o un enlace privado. La marca lo verá al revisar." :error="draftUrlError" v-slot="f">
              <BaseInput v-bind="f" v-model="draftUrl" type="url" inputmode="url" placeholder="Pega aquí el enlace" autocomplete="off" />
            </BaseField>
            <BaseField label="Enlace de la publicación" hint="Cuando esté publicada en la red, pega aquí su enlace. Queda como resultado de la colaboración." :error="resultUrlError" v-slot="f">
              <BaseInput v-bind="f" v-model="resultUrl" type="url" inputmode="url" placeholder="Pega aquí el enlace" autocomplete="off" />
            </BaseField>
            <p v-if="post.resultUrl || post.draftUrl" class="mt-4 text-sm text-[var(--text-muted)]">
              Guardado:
              <a v-if="post.draftUrl" :href="post.draftUrl" target="_blank" rel="noopener noreferrer nofollow" class="underline font-semibold text-[var(--text-strong)]">borrador ({{ linkHost(post.draftUrl) }})</a>
              <template v-if="post.draftUrl && post.resultUrl"> · </template>
              <a v-if="post.resultUrl" :href="post.resultUrl" target="_blank" rel="noopener noreferrer nofollow" class="underline font-semibold text-[var(--text-strong)]">publicación ({{ linkHost(post.resultUrl) }})</a>
            </p>
          </PanelCard>

          <PanelCard title="Planificación">
            <BaseField v-slot="f" label="Fecha de entrega">
              <DatePicker v-bind="f" v-model="dueDate" />
            </BaseField>
            <dl class="pfacts">
              <div class="pfacts__row">
                <dt>Red</dt>
                <dd class="pfacts__platform"><Icon :name="platformMeta[post.platform].icon" class="size-4" />{{ [post.platform, ...(post.extraPlatforms ?? [])].map((p) => platformMeta[p].label).join(' · ') }}</dd>
              </div>
              <div class="pfacts__row"><dt>Formato</dt><dd>{{ contentTypeMeta[post.contentType].label }}</dd></div>
              <div v-if="project && post.contentVersion" class="pfacts__row"><dt>Versión del contenido</dt><dd>v{{ post.contentVersion }}</dd></div>
              <div v-if="fmt(post.createdAt)" class="pfacts__row"><dt>Creada</dt><dd>{{ fmt(post.createdAt) }}</dd></div>
              <div v-if="fmt(post.updatedAt)" class="pfacts__row"><dt>Última edición</dt><dd>{{ fmt(post.updatedAt) }}</dd></div>
              <div v-if="post.status === 'published' && fmt(post.publishedAt)" class="pfacts__row"><dt>Publicada</dt><dd>{{ fmt(post.publishedAt) }}</dd></div>
            </dl>
          </PanelCard>

          <PanelCard title="Checklist" :description="checklistItems.length ? `${doneCount} de ${checklistItems.length} hechas` : undefined">
            <PostChecklistPanel v-model:new-text="newItemText" :items="checklistItems" :pct="checklistPct" @toggle="toggleItem" @remove="deleteItem" @add="addItem" />
          </PanelCard>

          <PanelCard title="Etiquetas">
            <PostLabelsPanel
              v-model:open="labelsPickerOpen" v-model:new-name="newLabelName" v-model:new-color="newLabelColor"
              :labels="labels" :attached="attachedLabels" :is-attached="isLabelAttached" @toggle="toggleLabel" @create="createAndAttachLabel"
            />
          </PanelCard>

          <template v-if="predictionsEnabled">
            <SuccessScoreCard
              v-if="post.successScore" :score="post.successScore" :ai-evaluated="post.aiEvaluated"
              :suggestions="post.suggestions ?? suggestionsForDraft" :generic-suggestions="!post.suggestions"
            />
            <PanelCard v-else title="Predicción de éxito" description="Todavía no has predicho el éxito de esta publicación.">
              <p class="pdetail__empty">
                <template v-if="creditBalance === 0">
                  Sin créditos. <NuxtLink to="/creator/profile?tab=billing" class="pdetail__project">Mejora tu plan</NuxtLink> para seguir prediciendo.
                </template>
                <template v-else>Consume 1 crédito · te quedan {{ creditBalance ?? '…' }}.</template>
              </p>
              <p v-if="predictError" class="field__error mb-3">{{ predictError }}</p>
              <BaseButton variant="secondary" :loading="predicting" :disabled="predicting || creditBalance === 0" @click="predict">
                {{ predicting ? 'Analizando…' : 'Predecir' }}
              </BaseButton>
            </PanelCard>
          </template>

          <PanelCard title="Reutilizar" description="Empieza otra pieza sin escribirlo todo de nuevo.">
            <div class="grid gap-2" data-reuse>
              <BaseButton variant="secondary" icon="ph:copy-bold" :loading="duplicating" :disabled="duplicating" data-duplicate-post @click="duplicate">Duplicar publicación</BaseButton>
              <BaseButton v-if="!naming" variant="ghost" icon="ph:floppy-disk-bold" data-save-as-template @click="startTemplate">Guardar como plantilla</BaseButton>
              <form v-else class="grid gap-2" @submit.prevent="saveAsTemplate">
                <label class="sr-only" for="post-template-name">Nombre de la plantilla</label>
                <input id="post-template-name" v-model="templateName" class="input w-full" maxlength="80" placeholder="Nombre: p. ej. Reseña en vídeo" autocomplete="off">
                <div class="flex gap-2">
                  <BaseButton variant="ghost" size="sm" type="button" @click="naming = false">Cancelar</BaseButton>
                  <BaseButton variant="primary" size="sm" type="submit" class="flex-1" :loading="templateBusy" :disabled="!templateName.trim()">Guardar plantilla</BaseButton>
                </div>
                <p class="text-sm text-[var(--text-muted)]">Guarda título, texto, formato, redes, hashtags y el checklist. No la fecha, la imagen ni la colaboración.</p>
                <p v-if="templateError" class="text-sm text-[var(--color-danger)]" role="alert">{{ templateError }}</p>
              </form>
            </div>
          </PanelCard>

          <div class="pdetail__danger">
            <span>Borrarla es definitivo.</span>
            <BaseButton variant="danger" size="sm" icon="ph:trash-fill" :loading="deleting" :disabled="deleting" @click="onRemove">Eliminar publicación</BaseButton>
          </div>
        </aside>
      </div>

      <ProfileSaveBar :dirty="dirty" :saving="saving" :saved="saved" :blocked-reason="blockedReason" @save="saveWithFeedback" @discard="discard" />
    </div>
  </AppShell>
</template>

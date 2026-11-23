<script setup lang="ts">
import { suggestionsForDraft, platformMeta } from '~/utils/mock-data'
import type { ContentType, Platform, Suggestion } from '~/types'
import { contentTypeMeta, relativeTime } from '~/utils/status'
import { draftStorageKey, isEmptyDraft, parseDraft, serializeDraft } from '~/utils/post-draft'
import { sanitizePostTemplate } from '~/utils/post-templates'

const { paymentsEnabled, predictionsEnabled } = useLaunchMode()

const props = defineProps<{
  /** Rellena el borrador al abrir — viene de "Usar esta idea" en Tendencias. */
  prefill?: { title: string; hashtags: string[]; contentType: ContentType; platform: Platform } | null
  /** Vincula la publicación a esta colaboración al crearla (viene de «Crear publicación» en un entregable). */
  collaborationId?: string
  /** Y la asigna a este entregable (hueco) de la colaboración. */
  deliverableId?: string
  /** Fecha de entrega con la que se abre («YYYY-MM-DD»): viene de pulsar un día del calendario. */
  presetDate?: string
}>()

const open = defineModel<boolean>({ default: false })
const { posts, createPost, updatePost } = useMyPosts()
const router = useRouter()
const toast = useToast()
const { balance: creditBalance, ensureLoaded: ensureCreditsLoaded, setBalance: setCreditBalance } = useMyCredits()
const { requests: collabRequests, ensureLoaded: ensureCollabRequestsLoaded } = useCollabRequests()
const { assign: assignDeliverable } = useCollabDeliverables()
const { addItem: addChecklistItem } = useChecklist()

// Solo las colaboraciones ya aceptadas tienen sentido aquí — pedir vincular
// una "requested" sería prometerle algo al partner que todavía no acordó.
const activeCollaborations = computed(() => collabRequests.value.filter((r) => r.status === 'accepted' || r.status === 'in_progress'))

const title = ref('')
const caption = ref('')
const contentType = ref<ContentType>('reel')
const platform = ref<Platform>('instagram')
const extraPlatforms = ref<Platform[]>([])
const collaborationId = ref('')
const hashtagsInput = ref('')
// Tareas del checklist que trae una plantilla: se añaden a la publicación en cuanto se crea.
const templateChecklist = ref<string[]>([])

// Antes esto no se podía elegir en ningún sitio: todo post nacía "a 3 días"
// a ciegas, sin forma de fijar ni editar una fecha real — ver useMyPosts.ts.
function defaultDueDate(): string {
  return new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
}
const todayIso = new Date().toISOString().slice(0, 10)
const dueDate = ref(defaultDueDate())

// Red y formato se eligen a la vista, con su logotipo o icono, no en dos desplegables.
const formatOptions = (Object.keys(contentTypeMeta) as ContentType[]).map((t) => ({ value: t, label: contentTypeMeta[t].label, icon: contentTypeMeta[t].icon }))
function setPrimary(p: Platform) {
  platform.value = p
  extraPlatforms.value = extraPlatforms.value.filter((x) => x !== p)
}
function toggleExtra(p: Platform) {
  extraPlatforms.value = extraPlatforms.value.includes(p) ? extraPlatforms.value.filter((x) => x !== p) : [...extraPlatforms.value, p]
}
const networkOptions = Object.entries(platformMeta).map(([value, meta]) => ({ value, label: meta.label, icon: meta.icon }))
// «¿Para quién es?»: propia (solo tú) o para una de tus colaboraciones aceptadas.
const ownershipOptions = [{ value: 'own', label: 'Contenido propio' }, { value: 'collab', label: 'Para una colaboración' }]
const ownership = computed({
  get: () => (collaborationId.value ? 'collab' : 'own'),
  set: (v: string) => { collaborationId.value = v === 'own' ? '' : (collaborationId.value || activeCollaborations.value[0]?.id || '') }
})

type Stage = 'draft' | 'predicting' | 'saving' | 'result'
const stage = ref<Stage>('draft')
const result = ref<{ score: number; aiEvaluated: boolean; suggestions: Suggestion[] } | null>(null)
const error = ref('')

// El post se crea de verdad (estado "idea") en el primer "Predecir éxito" o
// "Guardar sin predecir" — ambos caminos escriben en `posts`. Si se vuelve a
// "Editar" y se guarda/predice otra vez, se actualiza ese mismo post en vez
// de crear uno duplicado.
const createdPostId = ref<string | null>(null)
// Ya se llevó al usuario a la página de la publicación (o va de camino): no hace falta el aviso con enlace al cerrar.
const navigated = ref(false)

// ---- Borrador autoguardado (ver utils/post-draft.ts): lo escrito sobrevive a cerrar la hoja o la pestaña ----
const sessionUser = useSupabaseUser()
const draftKey = computed(() => {
  const u = sessionUser.value as { sub?: string; id?: string } | null
  const id = u?.sub ?? u?.id
  return id ? draftStorageKey(id) : null
})
const restoredAt = ref<string | null>(null)
let draftTimer: ReturnType<typeof setTimeout> | null = null

function readDraft() {
  try { return draftKey.value ? parseDraft(localStorage.getItem(draftKey.value)) : null } catch { return null }
}
function clearDraft() {
  try { if (draftKey.value) localStorage.removeItem(draftKey.value) } catch { /* sin almacenamiento: se sigue sin borrador */ }
}
function persistDraft() {
  if (!draftKey.value || createdPostId.value || stage.value !== 'draft') return
  const data = {
    title: title.value, caption: caption.value, contentType: contentType.value, platform: platform.value,
    extraPlatforms: extraPlatforms.value, hashtags: parsedHashtags(), collaborationId: collaborationId.value, dueDate: dueDate.value
  }
  try {
    if (isEmptyDraft(data)) localStorage.removeItem(draftKey.value)
    else localStorage.setItem(draftKey.value, serializeDraft(data))
  } catch { /* cuota llena o modo privado: no pasa nada */ }
}
function flushDraft() {
  if (draftTimer) { clearTimeout(draftTimer); draftTimer = null }
  if (open.value) persistDraft()
}
watch([title, caption, hashtagsInput, contentType, platform, extraPlatforms, collaborationId, dueDate], () => {
  if (!open.value) return
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(persistDraft, 600)
}, { deep: true })
onMounted(() => window.addEventListener('pagehide', flushDraft))
onBeforeUnmount(() => { window.removeEventListener('pagehide', flushDraft); if (draftTimer) clearTimeout(draftTimer) })

/** Si la hoja se abre en blanco y hay un borrador guardado, se recupera (la colaboración solo si sigue activa). */
function restoreDraft() {
  if (createdPostId.value || props.prefill || title.value || caption.value || hashtagsInput.value) return
  const d = readDraft()
  if (!d) return
  title.value = d.title
  caption.value = d.caption
  contentType.value = d.contentType
  platform.value = d.platform
  extraPlatforms.value = d.extraPlatforms
  hashtagsInput.value = d.hashtags.join(' ')
  if (d.dueDate && d.dueDate >= todayIso && !props.presetDate) dueDate.value = d.dueDate
  restoredAt.value = new Date(d.savedAt).toISOString()
  if (d.collaborationId && !props.collaborationId) {
    Promise.resolve(ensureCollabRequestsLoaded()).then(() => {
      if (open.value && activeCollaborations.value.some((c) => c.id === d.collaborationId)) collaborationId.value = d.collaborationId
    })
  }
}
function discardDraft() {
  clearDraft()
  restoredAt.value = null
  title.value = ''
  caption.value = ''
  hashtagsInput.value = ''
  extraPlatforms.value = []
  contentType.value = 'reel'
  platform.value = 'instagram'
  if (!props.collaborationId) collaborationId.value = ''
  dueDate.value = props.presetDate ?? defaultDueDate()
}

function detailPath(id: string) {
  return `/creator/post/${id}`
}

/** Cierra la hoja y abre la publicación — SOLO se llama tras confirmar el servidor que existe. */
async function openCreated(id: string) {
  navigated.value = true
  open.value = false
  await router.push(detailPath(id))
}

function parsedHashtags(): string[] {
  return hashtagsInput.value
    .split(/[\s,]+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
}

// Plantillas: lo que se guarda (y se reaplica) es lo que se repite de una publicación a otra, no la fecha ni la colaboración.
const templateCurrent = computed(() => ({
  title: title.value, caption: caption.value, contentType: contentType.value, platform: platform.value,
  extraPlatforms: extraPlatforms.value, hashtags: parsedHashtags(), checklist: templateChecklist.value
}))
function applyTemplate(raw: unknown) {
  const t = sanitizePostTemplate(raw)
  title.value = t.title
  caption.value = t.caption
  contentType.value = t.contentType
  platform.value = t.platform
  extraPlatforms.value = t.extraPlatforms
  hashtagsInput.value = t.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
  templateChecklist.value = t.checklist
}

// `true` solo en la llamada que acaba de crear la fila (no al actualizar el mismo borrador).
const justCreated = ref(false)

async function saveDraft(): Promise<string> {
  justCreated.value = false
  if (!createdPostId.value) {
    const created = await createPost({
      title: title.value,
      caption: caption.value,
      contentType: contentType.value,
      platform: platform.value,
      extraPlatforms: extraPlatforms.value,
      collaborationId: collaborationId.value || null,
      hashtags: parsedHashtags(),
      dueDate: dueDate.value
    })
    createdPostId.value = created.id
    justCreated.value = true
    clearDraft()
    restoredAt.value = null
    // Checklist de la plantilla: una tarea tras otra (para respetar el orden); si alguna falla, la publicación ya existe.
    if (templateChecklist.value.length) {
      try {
        for (const text of templateChecklist.value) await addChecklistItem(created.id, text)
      } catch {
        toast.error('Publicación creada, pero no se han podido añadir todas las tareas de la plantilla.')
      }
      templateChecklist.value = []
    }
    // Creada desde un entregable: se asigna en el mismo paso (el servidor valida que el hueco esté libre).
    if (props.deliverableId && props.collaborationId && collaborationId.value === props.collaborationId) {
      try {
        await assignDeliverable({ id: props.deliverableId, collaborationId: props.collaborationId }, created.id)
        toast.success('Publicación asignada al entregable.')
      } catch (e) {
        toast.error(e instanceof Error ? `Creada, pero no se ha podido asignar al entregable: ${e.message}` : 'Creada, pero no se ha podido asignar al entregable.')
      }
    }
  } else {
    await updatePost(createdPostId.value, { title: title.value, caption: caption.value, hashtags: parsedHashtags(), dueDate: dueDate.value })
  }
  return createdPostId.value
}

async function predict() {
  stage.value = 'predicting'
  error.value = ''
  try {
    const postId = await saveDraft()
    if (justCreated.value) toast.success('Publicación creada. Tienes su predicción abajo.', { action: { label: 'Abrir', to: detailPath(postId) } })
    const prediction = await $fetch('/api/ml/predict', { method: 'POST', body: { postId } })
    result.value = { score: prediction.successScore, aiEvaluated: prediction.aiEvaluated, suggestions: prediction.suggestions }
    // Igual que usePostEditorPanel: sin esto, al «Abrir publicación» la ficha
    // decía «Todavía no has predicho» hasta recargar (y ofrecía gastar otro crédito).
    const stored = posts.value.find((p) => p.id === postId)
    if (stored) {
      stored.successScore = prediction.successScore
      stored.aiEvaluated = prediction.aiEvaluated
      stored.suggestions = prediction.suggestions.length ? prediction.suggestions : undefined
    }
    setCreditBalance(prediction.creditsRemaining)
    stage.value = 'result'
  } catch (err) {
    console.error('[PostComposerSheet] fallo al predecir:', err)
    const statusCode = (err as { statusCode?: number; response?: { status?: number } })?.statusCode
      ?? (err as { response?: { status?: number } })?.response?.status
    error.value = statusCode === 402
      ? (paymentsEnabled ? 'Sin créditos disponibles. Mejora tu plan para seguir prediciendo.' : 'Sin créditos disponibles: durante el lanzamiento no se pueden ampliar.')
      : 'No se ha podido predecir. Inténtalo de nuevo.'
    stage.value = 'draft'
  }
}

// Guarda la publicación como idea sin gastar un crédito en predecir —
// para quien solo quiere dejarla anotada y predecirla más tarde desde su
// propia página (donde "Predecir" sigue disponible).
async function saveOnly() {
  stage.value = 'saving'
  error.value = ''
  try {
    const id = await saveDraft()
    toast.success('Publicación creada. Ya puedes seguir editándola.')
    await openCreated(id)
  } catch (err) {
    console.error('[PostComposerSheet] fallo al guardar:', err)
    error.value = 'No se ha podido guardar. Inténtalo de nuevo.'
    toast.error('No se ha podido crear la publicación. Inténtalo de nuevo.')
    stage.value = 'draft'
  }
}

function openPublication() {
  // El post ya quedó guardado de verdad al predecir (estado "idea"): esto solo lo abre.
  if (createdPostId.value) openCreated(createdPostId.value)
}

watch(open, (value) => {
  if (!value && createdPostId.value && !navigated.value) {
    // Cerró la hoja tras predecir sin abrir la publicación: se dice dónde quedó.
    toast.info('Publicación guardada como idea.', { action: { label: 'Abrir', to: detailPath(createdPostId.value) } })
  }
  if (value) {
    navigated.value = false
    if (!createdPostId.value) templateChecklist.value = []
    // Llegar desde una colaboración («Crear publicación») debe dejarla ya elegida: antes el valor
    // solo se aplicaba al cerrar la hoja, así que la primera vez salía «Contenido propio».
    if (props.collaborationId) collaborationId.value = props.collaborationId
    if (props.presetDate) dueDate.value = props.presetDate
    ensureCreditsLoaded()
    ensureCollabRequestsLoaded()
    if (props.prefill) {
      title.value = props.prefill.title
      contentType.value = props.prefill.contentType
      platform.value = props.prefill.platform
      extraPlatforms.value = []
      hashtagsInput.value = props.prefill.hashtags.join(' ')
    }
    restoreDraft()
    return
  }
  // Se cierra: lo escrito a medias queda guardado como borrador antes de vaciar el formulario.
  if (draftTimer) { clearTimeout(draftTimer); draftTimer = null }
  persistDraft()
  restoredAt.value = null
  stage.value = 'draft'
  title.value = ''
  caption.value = ''
  hashtagsInput.value = ''
  collaborationId.value = props.collaborationId ?? ''
  dueDate.value = defaultDueDate()
  createdPostId.value = null
  result.value = null
  error.value = ''
})
</script>

<template>
  <BottomSheet v-model="open" title="Nueva publicación" wide>
    <Transition name="nx-fade-slide" mode="out-in">
      <div v-if="stage !== 'result'" key="draft" class="composer">
        <p class="composer__lead">
          <Icon name="ph:lightbulb-fill" class="size-5 shrink-0" />
          Empieza por lo básico: podrás completar el resto, añadir la imagen y planificarla después en su ficha.
        </p>
        <p v-if="restoredAt" class="composer__restored" role="status" data-draft-restored>
          <Icon name="ph:clock-counter-clockwise-bold" class="size-4 shrink-0" aria-hidden="true" />
          <span>Hemos recuperado tu borrador ({{ relativeTime(restoredAt) }}).</span>
          <button type="button" class="underline font-semibold" data-draft-discard @click="discardDraft">Descartar</button>
        </p>

        <ProposalTemplateBar kind="post" :current="templateCurrent" apply-hint="revisa los datos y ajusta la fecha" @apply="applyTemplate" />
        <p v-if="templateChecklist.length" class="composer__tpl-note" data-template-checklist>
          <Icon name="ph:list-checks-bold" class="size-4 shrink-0" />
          La plantilla incluye {{ templateChecklist.length }} {{ templateChecklist.length === 1 ? 'tarea' : 'tareas' }} de checklist: se añadirán al crear la publicación.
        </p>

        <div class="composer__cols">
          <section class="composer__col" aria-label="Contenido">
            <BaseField label="Título interno" hint="Solo para reconocerla en tu tablero." v-slot="f">
              <BaseInput v-bind="f" v-model="title" placeholder="Reel: rutina de escritorio" maxlength="120" autofocus />
            </BaseField>
            <BaseField label="Texto de la publicación" optional :count="caption.length" :max="2200" v-slot="f">
              <BaseTextarea v-bind="f" v-model="caption" rows="5" placeholder="Escribe el texto que acompañará a tu publicación…" maxlength="2200" />
            </BaseField>
            <BaseField label="Hashtags" optional hint="Separados por espacios o comas; la almohadilla se pone sola." v-slot="f">
              <BaseInput v-bind="f" v-model="hashtagsInput" placeholder="#rutina #escritorio #productividad" />
            </BaseField>
          </section>

          <section class="composer__col composer__col--side" aria-label="Dónde y cuándo">
            <div v-if="activeCollaborations.length" class="composer__group">
              <p class="composer__legend">¿Para quién es?</p>
              <SegmentedTabs :model-value="ownership" :options="ownershipOptions" label="Para quién es la publicación" @update:model-value="ownership = $event" />
              <BaseField v-if="collaborationId" label="Colaboración" v-slot="f">
                <BaseSelect v-bind="f" v-model="collaborationId">
                  <option v-for="c in activeCollaborations" :key="c.id" :value="c.id">{{ c.campaignName ? `${c.campaignName} · ${c.partnerName}` : c.partnerName }}</option>
                </BaseSelect>
              </BaseField>
              <p class="composer__note">
                <Icon :name="collaborationId ? 'ph:eye-bold' : 'ph:lock-simple-bold'" class="size-4 shrink-0" />
                <template v-if="collaborationId">
                  {{ activeCollaborations.find((c) => c.id === collaborationId)?.partnerName }} verá su progreso (checklist y fase) y, cuando la marques «Para revisar», podrá aprobarla o pedirte cambios.
                </template>
                <template v-else>Solo tú la verás: no se comparte con ninguna marca ni cuenta como entregable.</template>
              </p>
            </div>

            <div class="composer__group">
              <p id="composer-network" class="composer__legend">Red donde se publicará</p>
              <ChoiceChips :model-value="platform" :options="networkOptions" label="Red donde se publicará" @update:model-value="setPrimary($event as Platform)" />
              <p class="composer__legend composer__legend--sub">¿También en otras redes? <span class="font-normal">(opcional)</span></p>
              <div class="choice-chips" role="group" aria-label="Otras redes donde se publicará">
                <button
                  v-for="o in networkOptions.filter((n) => n.value !== platform)" :key="o.value" type="button" class="choice__item"
                  :aria-pressed="extraPlatforms.includes(o.value as Platform)" @click="toggleExtra(o.value as Platform)"
                >
                  <Icon :name="o.icon" class="choice__icon" />
                  {{ o.label }}
                </button>
              </div>
            </div>
            <div class="composer__group">
              <p class="composer__legend">Formato</p>
              <ChoiceChips :model-value="contentType" :options="formatOptions" label="Formato" @update:model-value="contentType = $event as ContentType" />
            </div>

            <BaseField label="Fecha de entrega" v-slot="f">
              <DatePicker v-bind="f" v-model="dueDate" :min="todayIso" />
            </BaseField>
          </section>
        </div>

        <p v-if="error" class="composer__error" role="alert">{{ error }}</p>

        <div class="composer__foot">
          <p v-if="predictionsEnabled" class="composer__credits">
            <template v-if="creditBalance === 0 && !paymentsEnabled">Sin créditos: durante el lanzamiento no se pueden ampliar.</template>
            <template v-else-if="creditBalance === 0">
              Sin créditos —
              <NuxtLink to="/creator/profile?tab=billing" class="underline underline-offset-2">mejora tu plan</NuxtLink>
              para seguir prediciendo
            </template>
            <template v-else>Predecir consume 1 crédito · te quedan {{ creditBalance ?? '…' }}</template>
          </p>
          <div class="composer__actions">
            <BaseButton
              :variant="predictionsEnabled ? 'secondary' : 'primary'" size="lg"
              :icon="stage === 'saving' ? 'ph:circle-notch-bold' : 'ph:note-pencil-fill'" :icon-spin="stage === 'saving'"
              :disabled="!title || stage === 'predicting' || stage === 'saving'" @click="saveOnly"
            >
              {{ stage === 'saving' ? 'Guardando…' : predictionsEnabled ? 'Guardar sin predecir' : 'Guardar publicación' }}
            </BaseButton>
            <BaseButton
              v-if="predictionsEnabled" variant="primary" size="lg"
              :icon="stage === 'predicting' ? 'ph:circle-notch-bold' : 'ph:sparkle-fill'" :icon-spin="stage === 'predicting'"
              :disabled="!title || stage === 'predicting' || stage === 'saving' || creditBalance === 0" @click="predict"
            >
              {{ stage === 'predicting' ? 'Analizando…' : 'Predecir éxito' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <div v-else-if="result" key="result">
        <SuccessScoreCard
          :score="result.score" :ai-evaluated="result.aiEvaluated"
          :suggestions="result.suggestions.length ? result.suggestions : suggestionsForDraft" :generic-suggestions="!result.suggestions.length"
        />
        <div class="flex gap-2.5 mt-5">
          <BaseButton variant="secondary" class="flex-1" @click="stage = 'draft'">Editar</BaseButton>
          <BaseButton variant="primary" class="flex-1" icon="ph:arrow-square-out-bold" data-open-publication @click="openPublication">Abrir publicación</BaseButton>
        </div>
      </div>
    </Transition>
  </BottomSheet>
</template>

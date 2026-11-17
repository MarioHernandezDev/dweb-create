<script setup lang="ts">
import { suggestionsForDraft, platformMeta } from '~/utils/mock-data'
import type { ContentType, Platform, Suggestion } from '~/types'
import { contentTypeMeta } from '~/utils/status'

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

// Solo las colaboraciones ya aceptadas tienen sentido aquí — pedir vincular
// una "requested" sería prometerle algo al partner que todavía no acordó.
const activeCollaborations = computed(() => collabRequests.value.filter((r) => r.status === 'accepted' || r.status === 'in_progress'))

const title = ref('')
const caption = ref('')
const contentType = ref<ContentType>('reel')
const platform = ref<Platform>('instagram')
const collaborationId = ref('')
const hashtagsInput = ref('')

// Antes esto no se podía elegir en ningún sitio: todo post nacía "a 3 días"
// a ciegas, sin forma de fijar ni editar una fecha real — ver useMyPosts.ts.
function defaultDueDate(): string {
  return new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
}
const todayIso = new Date().toISOString().slice(0, 10)
const dueDate = ref(defaultDueDate())

// Red y formato se eligen a la vista, con su logotipo o icono, no en dos desplegables.
const formatOptions = (Object.keys(contentTypeMeta) as ContentType[]).map((t) => ({ value: t, label: contentTypeMeta[t].label, icon: contentTypeMeta[t].icon }))
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
      collaborationId: collaborationId.value || null,
      hashtags: parsedHashtags(),
      dueDate: dueDate.value
    })
    createdPostId.value = created.id
    justCreated.value = true
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
      hashtagsInput.value = props.prefill.hashtags.join(' ')
    }
    return
  }
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
                  <option v-for="c in activeCollaborations" :key="c.id" :value="c.id">{{ c.partnerName }}</option>
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
              <ChoiceChips :model-value="platform" :options="networkOptions" label="Red donde se publicará" @update:model-value="platform = $event as Platform" />
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

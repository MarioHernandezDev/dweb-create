<script setup lang="ts">
import { suggestionsForDraft, platformMeta } from '~/utils/mock-data'
import type { ContentType, Platform, Suggestion } from '~/types'
import { contentTypeMeta } from '~/utils/status'

const props = defineProps<{
  /** Rellena el borrador al abrir — viene de "Usar esta idea" en Tendencias. */
  prefill?: { title: string; hashtags: string[]; contentType: ContentType; platform: Platform } | null
}>()

const open = defineModel<boolean>({ default: false })
const { createPost, updatePost } = useMyPosts()
const { balance: creditBalance, ensureLoaded: ensureCreditsLoaded, setBalance: setCreditBalance } = useMyCredits()
const { requests: collabRequests, ensureLoaded: ensureCollabRequestsLoaded } = useCollabRequests()

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

const contentTypes = Object.keys(contentTypeMeta) as ContentType[]
const platforms = Object.entries(platformMeta).map(([value, meta]) => ({ value: value as Platform, label: meta.label }))

type Stage = 'draft' | 'predicting' | 'saving' | 'result'
const stage = ref<Stage>('draft')
const result = ref<{ score: number; aiEvaluated: boolean; suggestions: Suggestion[] } | null>(null)
const error = ref('')

// El post se crea de verdad (estado "idea") en el primer "Predecir éxito" o
// "Guardar sin predecir" — ambos caminos escriben en `posts`. Si se vuelve a
// "Editar" y se guarda/predice otra vez, se actualiza ese mismo post en vez
// de crear uno duplicado.
const createdPostId = ref<string | null>(null)

function parsedHashtags(): string[] {
  return hashtagsInput.value
    .split(/[\s,]+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
}

async function saveDraft(): Promise<string> {
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
    const prediction = await $fetch('/api/ml/predict', { method: 'POST', body: { postId } })
    result.value = { score: prediction.successScore, aiEvaluated: prediction.aiEvaluated, suggestions: prediction.suggestions }
    setCreditBalance(prediction.creditsRemaining)
    stage.value = 'result'
  } catch (err) {
    console.error('[PostComposerSheet] fallo al predecir:', err)
    const statusCode = (err as { statusCode?: number; response?: { status?: number } })?.statusCode
      ?? (err as { response?: { status?: number } })?.response?.status
    error.value = statusCode === 402
      ? 'Sin créditos disponibles. Mejora tu plan para seguir prediciendo.'
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
    await saveDraft()
    open.value = false
  } catch (err) {
    console.error('[PostComposerSheet] fallo al guardar:', err)
    error.value = 'No se ha podido guardar. Inténtalo de nuevo.'
    stage.value = 'draft'
  }
}

function schedule() {
  // El post ya quedó guardado de verdad al predecir — aquí solo se cierra.
  open.value = false
}

watch(open, (value) => {
  if (value) {
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
  collaborationId.value = ''
  dueDate.value = defaultDueDate()
  createdPostId.value = null
  result.value = null
  error.value = ''
})
</script>

<template>
  <BottomSheet v-model="open" title="Nueva publicación">
    <Transition name="nx-fade-slide" mode="out-in">
      <div v-if="stage !== 'result'" key="draft" class="flex flex-col gap-4">
        <div>
          <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="post-title">Título interno</label>
          <input
            id="post-title" v-model="title" type="text" placeholder="Reel: rutina de escritorio"
            class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
          >
        </div>

        <div>
          <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="post-caption">Caption</label>
          <textarea
            id="post-caption" v-model="caption" rows="3" placeholder="Escribe el texto que acompaña tu publicación…"
            class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
          />
        </div>

        <div v-if="activeCollaborations.length">
          <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="post-collab">Colaboración</label>
          <select
            id="post-collab" v-model="collaborationId"
            class="w-full h-11 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)]"
          >
            <option value="">Contenido propio</option>
            <option v-for="c in activeCollaborations" :key="c.id" :value="c.id">{{ c.partnerName }}</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5">Formato</p>
            <select v-model="contentType" class="w-full h-11 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)]">
              <option v-for="t in contentTypes" :key="t" :value="t">{{ contentTypeMeta[t].label }}</option>
            </select>
          </div>
          <div>
            <p class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5">Red</p>
            <select v-model="platform" class="w-full h-11 px-3 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)]">
              <option v-for="p in platforms" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="post-due-date">Fecha de entrega</label>
          <input
            id="post-due-date" v-model="dueDate" type="date" :min="todayIso"
            class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
          >
        </div>

        <div>
          <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="post-hashtags">Hashtags</label>
          <input
            id="post-hashtags" v-model="hashtagsInput" type="text" placeholder="#rutina #escritorio #productividad"
            class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
          >
        </div>

        <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)] -mt-1">{{ error }}</p>

        <BaseButton
          variant="primary" size="lg"
          :icon="stage === 'predicting' ? 'ph:circle-notch-bold' : 'ph:sparkle-fill'" :icon-spin="stage === 'predicting'"
          class="w-full mt-1"
          :disabled="!title || stage === 'predicting' || stage === 'saving' || creditBalance === 0" @click="predict"
        >
          {{ stage === 'predicting' ? 'Analizando…' : 'Predecir éxito' }}
        </BaseButton>
        <p class="text-center text-[0.75rem] text-[var(--color-text-faint)] -mt-2">
          <template v-if="creditBalance === 0">
            Sin créditos —
            <NuxtLink to="/creator/profile?tab=billing" class="text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] underline underline-offset-2">mejora tu plan</NuxtLink>
            para seguir prediciendo
          </template>
          <template v-else>Consume 1 crédito · te quedan {{ creditBalance ?? '…' }}</template>
        </p>

        <BaseButton
          variant="secondary" size="lg"
          :icon="stage === 'saving' ? 'ph:circle-notch-bold' : 'ph:note-pencil-fill'" :icon-spin="stage === 'saving'"
          class="w-full"
          :disabled="!title || stage === 'predicting' || stage === 'saving'" @click="saveOnly"
        >
          {{ stage === 'saving' ? 'Guardando…' : 'Guardar sin predecir' }}
        </BaseButton>
      </div>

      <div v-else-if="result" key="result">
        <SuccessScoreCard
          :score="result.score" :ai-evaluated="result.aiEvaluated"
          :suggestions="result.suggestions.length ? result.suggestions : suggestionsForDraft" :generic-suggestions="!result.suggestions.length"
        />
        <div class="flex gap-2.5 mt-5">
          <BaseButton variant="secondary" class="flex-1" @click="stage = 'draft'">Editar</BaseButton>
          <BaseButton variant="primary" class="flex-1" icon="ph:calendar-plus-fill" @click="schedule">Programar</BaseButton>
        </div>
      </div>
    </Transition>
  </BottomSheet>
</template>

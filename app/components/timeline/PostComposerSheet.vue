<script setup lang="ts">
import { suggestionsForDraft, platformMeta } from '~/utils/mock-data'
import type { ContentType, Platform } from '~/types'
import { contentTypeMeta } from '~/utils/status'

const open = defineModel<boolean>({ default: false })
const { createPost, updatePost } = useMyPosts()

const title = ref('')
const caption = ref('')
const contentType = ref<ContentType>('reel')
const platform = ref<Platform>('instagram')

const contentTypes = Object.keys(contentTypeMeta) as ContentType[]
const platforms = Object.entries(platformMeta).map(([value, meta]) => ({ value: value as Platform, label: meta.label }))

type Stage = 'draft' | 'loading' | 'result'
const stage = ref<Stage>('draft')
const result = ref<{ score: number; confidence: number } | null>(null)
const error = ref('')

// El post se crea de verdad (estado "idea") en el primer "Predecir éxito" —
// /api/ml/predict solo puede puntuar algo que ya existe en `posts` (ahí es
// donde se guarda la predicción). Si se vuelve a "Editar" y se predice otra
// vez, se actualiza ese mismo post en vez de crear uno duplicado.
const createdPostId = ref<string | null>(null)

async function predict() {
  stage.value = 'loading'
  error.value = ''
  try {
    if (!createdPostId.value) {
      const created = await createPost({ title: title.value, caption: caption.value, contentType: contentType.value, platform: platform.value })
      createdPostId.value = created.id
    } else {
      await updatePost(createdPostId.value, { title: title.value, caption: caption.value })
    }

    const prediction = await $fetch('/api/ml/predict', { method: 'POST', body: { postId: createdPostId.value } })
    result.value = { score: prediction.successScore, confidence: prediction.confidence }
    stage.value = 'result'
  } catch (err) {
    console.error('[PostComposerSheet] fallo al predecir:', err)
    error.value = 'No se ha podido predecir. Inténtalo de nuevo.'
    stage.value = 'draft'
  }
}

function schedule() {
  // El post ya quedó guardado de verdad al predecir — aquí solo se cierra.
  open.value = false
}

watch(open, (value) => {
  if (!value) {
    stage.value = 'draft'
    title.value = ''
    caption.value = ''
    createdPostId.value = null
    result.value = null
    error.value = ''
  }
})
</script>

<template>
  <BottomSheet v-model="open" title="Nueva publicación">
    <Transition name="nx-fade-slide" mode="out-in">
      <div v-if="stage === 'draft' || stage === 'loading'" key="draft" class="flex flex-col gap-4">
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

        <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)] -mt-1">{{ error }}</p>

        <BaseButton
          variant="primary" size="lg"
          :icon="stage === 'loading' ? 'ph:circle-notch-bold' : 'ph:sparkle-fill'" :icon-spin="stage === 'loading'"
          class="w-full mt-1"
          :disabled="!title || stage === 'loading'" @click="predict"
        >
          {{ stage === 'loading' ? 'Analizando…' : 'Predecir éxito' }}
        </BaseButton>
        <p class="text-center text-[0.75rem] text-[var(--color-text-faint)] -mt-2">Consume 1 crédito de tu plan</p>
      </div>

      <div v-else-if="result" key="result">
        <SuccessScoreCard :score="result.score" :confidence="result.confidence" :suggestions="suggestionsForDraft" />
        <div class="flex gap-2.5 mt-5">
          <BaseButton variant="secondary" class="flex-1" @click="stage = 'draft'">Editar</BaseButton>
          <BaseButton variant="primary" class="flex-1" icon="ph:calendar-plus-fill" @click="schedule">Programar</BaseButton>
        </div>
      </div>
    </Transition>
  </BottomSheet>
</template>

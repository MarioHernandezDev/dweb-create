<script setup lang="ts">
import { suggestionsForDraft, platformMeta } from '~/utils/mock-data'
import type { ContentType, Platform } from '~/types'
import { contentTypeMeta } from '~/utils/status'

const open = defineModel<boolean>({ default: false })

const title = ref('')
const caption = ref('')
const contentType = ref<ContentType>('reel')
const platform = ref<Platform>('instagram')

const contentTypes = Object.keys(contentTypeMeta) as ContentType[]
const platforms = Object.entries(platformMeta).map(([value, meta]) => ({ value: value as Platform, label: meta.label }))

type Stage = 'draft' | 'loading' | 'result'
const stage = ref<Stage>('draft')
const result = ref<{ score: number; confidence: number } | null>(null)

function predict() {
  stage.value = 'loading'
  setTimeout(() => {
    const base = 52 + Math.min(title.value.length, 20) + (caption.value.length > 40 ? 10 : 0)
    result.value = { score: Math.min(96, base), confidence: 0.74 + Math.random() * 0.15 }
    stage.value = 'result'
  }, 900)
}

watch(open, (value) => {
  if (!value) {
    stage.value = 'draft'
    title.value = ''
    caption.value = ''
  }
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
          <BaseButton variant="primary" class="flex-1" icon="ph:calendar-plus-fill" @click="open = false">Programar</BaseButton>
        </div>
      </div>
    </Transition>
  </BottomSheet>
</template>

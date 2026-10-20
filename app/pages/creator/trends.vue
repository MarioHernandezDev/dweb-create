<script setup lang="ts">
import type { ContentType, Platform, TrendSuggestion } from '~/types'
import { platformMeta } from '~/utils/mock-data'

useHead({ title: 'Tendencias' })

const { trends, loading, ensureLoaded, refresh } = useMyTrends()
await ensureLoaded()

const platformFilter = ref<Platform | 'all'>('all')
const platformOptions = computed(() => [
  { value: 'all', label: 'Todas' },
  ...Object.entries(platformMeta).map(([value, meta]) => ({ value: value as Platform, label: meta.label }))
])

// Solo en esta sesión de pestaña — descartar una idea no la borra de
// `trends` (esa caché es compartida por nicho entre creadores), solo deja
// de mostrártela a ti hasta que recargues.
const dismissedIds = ref(new Set<string>())
function dismiss(trend: TrendSuggestion) {
  dismissedIds.value = new Set(dismissedIds.value).add(trend.id)
}

const visibleTrends = computed(() =>
  trends.value.filter((t) => !dismissedIds.value.has(t.id) && (platformFilter.value === 'all' || t.platform === platformFilter.value))
)

async function findMore() {
  dismissedIds.value = new Set()
  await refresh(true)
}

function guessContentType(format: string): ContentType {
  const f = format.toLowerCase()
  if (f.includes('carrusel') || f.includes('láminas') || f.includes('lamina')) return 'carousel'
  if (f.includes('story') || f.includes('historia')) return 'story'
  if (f.includes('imagen') || f.includes('foto') || f.includes('captura')) return 'image'
  if (f.includes('reel')) return 'reel'
  return 'video'
}

const composerOpen = ref(false)
const prefill = ref<{ title: string; hashtags: string[]; contentType: ContentType; platform: Platform } | null>(null)

function useTrend(trend: TrendSuggestion) {
  prefill.value = {
    title: trend.topic,
    hashtags: trend.hashtags,
    contentType: guessContentType(trend.format),
    platform: trend.platform
  }
  composerOpen.value = true
}

function createBlank() {
  prefill.value = null
  composerOpen.value = true
}
</script>

<template>
  <AppShell role="creator" title="Tendencias" subtitle="Ideas de contenido generadas para tu nicho" full-width>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="opt in platformOptions" :key="opt.value" type="button"
          class="px-3 h-8 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium border transition-colors"
          :class="platformFilter === opt.value
            ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)] text-white'
            : 'bg-[var(--color-ink-overlay)] border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
          @click="platformFilter = opt.value as Platform | 'all'"
        >
          {{ opt.label }}
        </button>
      </div>

      <BaseButton variant="secondary" size="sm" icon="ph:arrows-clockwise-bold" :icon-spin="loading" :disabled="loading" @click="findMore">
        Buscar más ideas
      </BaseButton>
    </div>

    <EmptyState
      v-if="!loading && !visibleTrends.length"
      icon="ph:flame" title="Sin ideas por ahora"
      description="Prueba a quitar el filtro de red o a pedir ideas nuevas."
    />
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <TrendCard v-for="trend in visibleTrends" :key="trend.id" :trend="trend" @use="useTrend" @dismiss="dismiss" />
    </div>

    <Fab :active="composerOpen" @click="createBlank" />
    <PostComposerSheet v-model="composerOpen" :prefill="prefill" />
  </AppShell>
</template>

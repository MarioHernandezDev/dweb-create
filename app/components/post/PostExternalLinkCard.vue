<script setup lang="ts">
import { platformMeta } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import type { Platform } from '~/types'

/**
 * Vínculo de la publicación con su contenido real (A-R7) y, cuando existe, sus
 * métricas (A-R8b). El vínculo SOLO lo escribe el servidor tras comprobar con
 * YouTube/Instagram que el contenido es de la cuenta conectada; aquí solo se
 * pega el enlace. Estados: sin cuenta conectada, cuenta que hay que reconectar,
 * sin vincular, vinculando, vinculada, error y desvinculando.
 */
const props = defineProps<{ postId: string; platform: Platform }>()

const meta = computed(() => platformMeta[props.platform])
const { accounts, ensureLoaded } = useMySocialAccounts()
const { confirm } = useConfirm()
const { link, loading, loaded, busy, error, load, linkTo, unlink } = usePostExternalLink(toRef(props, 'postId'))

const account = computed(() => accounts.value.find((a) => a.platform === props.platform))
const accountState = computed<'missing' | 'reconnect' | 'ok'>(() => {
  const a = account.value
  if (!a?.connected) return 'missing'
  return a.status && a.status !== 'connected' ? 'reconnect' : 'ok'
})

const url = ref('')
const placeholder = computed(() => (props.platform === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'https://www.instagram.com/p/…'))

onMounted(async () => {
  await ensureLoaded()
  await load()
})

async function submit() {
  if (!url.value.trim() || busy.value) return
  if (await linkTo(url.value)) url.value = ''
}

async function onUnlink() {
  const ok = await confirm({
    title: '¿Desvincular esta publicación?',
    message: `Dejará de estar enlazada con su contenido de ${meta.value.label} y se borrarán las métricas guardadas de esta publicación (describen ese contenido). El contenido en ${meta.value.label} no se toca.`,
    confirmLabel: 'Desvincular', tone: 'danger', icon: 'ph:link-break-bold'
  })
  if (ok) await unlink()
}
</script>

<template>
  <BaseCard radius="lg" padding="lg" class="flex flex-col gap-3" data-external-link-card>
    <div class="flex items-center gap-2.5">
      <span
        class="flex items-center justify-center size-8 rounded-full shrink-0"
        :style="{ background: `color-mix(in oklab, ${meta.colorVar} 18%, transparent)`, color: meta.colorVar }"
      >
        <Icon :name="meta.icon" class="size-4" />
      </span>
      <div class="min-w-0">
        <p class="text-[0.9375rem] font-medium text-[var(--color-text)]">Contenido en {{ meta.label }}</p>
        <p class="text-[0.75rem] text-[var(--color-text-faint)]">Enlaza esta publicación con el contenido real para ver sus métricas.</p>
      </div>
    </div>

    <SkeletonBlock v-if="loading && !loaded" height="2.5rem" rounded="var(--radius-sm)" />

    <!-- Sin cuenta o cuenta que ya no sirve -->
    <p v-else-if="accountState === 'missing'" class="text-[0.8125rem] text-[var(--color-text-muted)]" data-link-state="missing">
      Conecta tu cuenta de {{ meta.label }} para poder vincular contenido.
      <NuxtLink to="/creator/metrics#conexiones" class="font-medium text-[var(--color-text)] underline underline-offset-2">Ir a conexiones</NuxtLink>
    </p>
    <p v-else-if="accountState === 'reconnect' && !link" class="text-[0.8125rem] text-[var(--color-status-alert)]" data-link-state="reconnect">
      Hay que reconectar tu cuenta de {{ meta.label }} antes de vincular contenido.
      <NuxtLink to="/creator/metrics#conexiones" class="font-medium underline underline-offset-2">Reconectar</NuxtLink>
    </p>

    <!-- Vinculada -->
    <template v-else-if="link">
      <div class="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)] p-3" data-link-state="linked">
        <p class="flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-status-published)]">
          <Icon name="ph:seal-check-fill" class="size-4" /> Vinculada y verificada {{ relativeTime(link.verified_at) }}
        </p>
        <a
          v-if="link.external_url" :href="link.external_url" target="_blank" rel="noopener noreferrer"
          class="mt-1 block truncate text-[0.8125rem] text-[var(--color-text)] hover:underline" :title="link.external_url"
        >
          {{ link.external_url }}
        </a>
        <p class="mt-1 text-[0.6875rem] text-[var(--color-text-faint)]">Comprobado con {{ meta.label }}: el contenido es de tu cuenta conectada.</p>
      </div>
      <slot name="metrics" :link="link" />
      <BaseButton variant="ghost" size="sm" icon="ph:link-break-bold" :disabled="busy" class="self-start" @click="onUnlink">Desvincular</BaseButton>
    </template>

    <!-- Sin vincular -->
    <form v-else class="flex flex-col gap-2" data-link-state="unlinked" @submit.prevent="submit">
      <label class="sr-only" :for="`link-url-${postId}`">Enlace del contenido en {{ meta.label }}</label>
      <input
        :id="`link-url-${postId}`" v-model="url" type="url" inputmode="url" autocomplete="off" :placeholder="placeholder" :disabled="busy"
        class="h-11 w-full px-3 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 disabled:opacity-60"
      >
      <BaseButton type="submit" variant="secondary" size="sm" icon="ph:link-bold" :icon-spin="busy" :disabled="!url.trim() || busy">
        {{ busy ? `Comprobando con ${meta.label}…` : 'Vincular' }}
      </BaseButton>
    </form>

    <p v-if="error" class="text-[0.8125rem] text-[var(--color-status-alert)]" role="alert" data-link-error>
      {{ error.message }}
      <NuxtLink v-if="error.code === 'reconnect_required'" to="/creator/metrics#conexiones" class="font-medium underline underline-offset-2">Reconectar</NuxtLink>
    </p>
  </BaseCard>
</template>

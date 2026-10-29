<script setup lang="ts">
import { platformMeta } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'

/**
 * Cabecera del canal: quién es, en qué estado está la conexión y cuándo se
 * actualizó por última vez. El estado sale de lo que el servidor ha guardado
 * (no de que exista una fila): una fila no es una conexión válida.
 */
export type YoutubeConnectionState = 'ok' | 'reconnect' | 'analytics' | 'error'

const props = defineProps<{
  title: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
  channelId: string | null
  connection: YoutubeConnectionState
  /** `social_accounts.last_synced_at` — la última sincronización CORRECTA. */
  lastSyncedAt: string | null
  loading?: boolean
}>()
defineEmits<{ reload: [] }>()

const meta = platformMeta.youtube

const chip = computed(() => {
  switch (props.connection) {
    case 'ok': return { label: 'Conectada', color: 'var(--color-status-published)' }
    case 'analytics': return { label: 'Conectada · analíticas no disponibles', color: 'var(--color-text-faint)' }
    case 'reconnect': return { label: 'Necesita reconexión', color: 'var(--color-status-alert)' }
    default: return { label: 'Error en la última carga', color: 'var(--color-status-alert)' }
  }
})

const memberSince = computed(() => {
  if (!props.publishedAt) return null
  const d = new Date(props.publishedAt)
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : null
})

// "Actualizado" solo si hay una sincronización correcta registrada: sin ella no se inventa una hora.
const updated = computed(() => {
  if (!props.lastSyncedAt) return null
  return Number.isFinite(new Date(props.lastSyncedAt).getTime()) ? relativeTime(props.lastSyncedAt) : null
})
</script>

<template>
  <BaseCard radius="lg" padding="lg" class="flex flex-wrap items-center gap-4 md:max-w-4xl">
    <div class="relative size-16 rounded-full shrink-0 overflow-hidden border-2" :style="{ borderColor: meta.colorVar }">
      <img v-if="thumbnailUrl" :src="thumbnailUrl" alt="" class="absolute inset-0 size-full object-cover">
      <div v-else class="absolute inset-0 flex items-center justify-center" :style="{ background: meta.colorVar }">
        <Icon :name="meta.icon" class="size-7 text-white" />
      </div>
    </div>

    <div class="min-w-0 flex-1 basis-56">
      <p class="font-display text-[1.375rem] leading-tight text-[var(--color-text)] truncate">{{ title ?? meta.label }}</p>
      <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8125rem] text-[var(--color-text-muted)]">
        <span class="inline-flex items-center gap-1.5 font-medium" :style="{ color: chip.color }">
          <span class="size-2 rounded-full shrink-0" :style="{ background: chip.color }" aria-hidden="true" />
          {{ chip.label }}
        </span>
        <span v-if="updated" class="text-[var(--color-text-faint)]">· actualizado {{ updated }}</span>
        <span v-if="memberSince" class="text-[var(--color-text-faint)]">· miembro desde {{ memberSince }}</span>
      </p>
      <p class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem]">
        <a
          v-if="channelId" :href="`https://www.youtube.com/channel/${channelId}`" target="_blank" rel="noopener noreferrer"
          class="inline-flex items-center gap-1 font-medium text-[var(--color-primary-500)] hover:underline"
        >
          Ver en YouTube
          <Icon name="ph:arrow-square-out-bold" class="size-3.5" />
        </a>
        <NuxtLink to="/creator/socials" class="font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline">
          Gestionar conexión
        </NuxtLink>
      </p>
    </div>

    <BaseButton variant="secondary" size="sm" icon="ph:arrows-clockwise-bold" :icon-spin="loading" :disabled="loading" @click="$emit('reload')">
      Actualizar
    </BaseButton>
  </BaseCard>
</template>

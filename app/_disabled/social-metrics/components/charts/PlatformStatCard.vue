<script setup lang="ts">
import type { Platform } from '~/types'
import { platformMeta, formatCompactNumber, isComingSoonPlatform } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'

/**
 * Una tarjeta por red social en "Tus métricas": mismo trío de estados que
 * SocialAccountRow.vue (conectada / sin conectar / próximamente), pero
 * orientada a mostrar el número y el estado de los datos, no a gestionar la
 * conexión. Si la conexión ya no sirve (`needsReconnect`) lo dice en la propia
 * tarjeta y la cifra se presenta como último dato guardado. `sharePct` es la
 * parte del total de seguidores verificados: la decide la página. Si está
 * conectada, la tarjeta entera enlaza a `/creator/metrics/<red>`.
 */
const props = defineProps<{
  platform: Platform
  state: 'connected' | 'disconnected'
  followers?: number
  sharePct?: number
  handle?: string
  needsReconnect?: boolean
  lastSyncedAt?: string | null
}>()

const meta = computed(() => platformMeta[props.platform])
</script>

<template>
  <NuxtLink
    v-if="state === 'connected'" :to="`/creator/metrics/${platform}`"
    class="block focus-visible:outline-none"
  >
    <BaseCard radius="lg" padding="lg" interactive class="flex flex-col gap-4 h-full">
      <div class="flex items-center gap-3">
        <span
          class="flex items-center justify-center size-11 rounded-full shrink-0"
          :style="{ background: `color-mix(in oklab, ${meta.colorVar} 18%, transparent)`, color: meta.colorVar }"
        >
          <Icon :name="meta.icon" class="size-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-base font-medium text-[var(--color-text)]">{{ meta.label }}</p>
          <p v-if="handle" class="truncate text-sm text-[var(--color-text-muted)]">{{ handle }}</p>
        </div>
        <span
          class="shrink-0 rounded-full px-2.5 py-1 text-micro font-medium"
          :class="needsReconnect ? 'bg-[color-mix(in_oklab,var(--color-status-alert)_14%,transparent)] text-[var(--color-status-alert)]' : 'bg-[color-mix(in_oklab,var(--color-status-published)_14%,transparent)] text-[var(--color-status-published)]'"
        >
          {{ needsReconnect ? 'Reconectar' : 'Conectada' }}
        </span>
      </div>

      <div>
        <p class="font-display text-[2.5rem] leading-none text-[var(--color-text)]" style="font-variant-numeric: proportional-nums">
          {{ formatCompactNumber(followers ?? 0) }}
        </p>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">
          {{ platform === 'youtube' ? (followers === 1 ? 'suscriptor' : 'suscriptores') : (followers === 1 ? 'seguidor' : 'seguidores') }}{{ needsReconnect ? ' · último dato guardado' : '' }}
        </p>
      </div>

      <div>
        <div class="h-1.5 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
          <div class="h-full rounded-full transition-[width] duration-500" :style="{ width: `${sharePct ?? 0}%`, background: meta.colorVar }" />
        </div>
        <p class="mt-1.5 text-micro text-[var(--color-text-faint)]">{{ Math.round(sharePct ?? 0) }} % de tus seguidores totales</p>
      </div>

      <div class="mt-auto flex items-center justify-between gap-3 text-micro">
        <span class="text-[var(--color-text-faint)]">
          {{ lastSyncedAt ? `Actualizado ${relativeTime(lastSyncedAt)}` : 'Aún sin sincronizar' }}
        </span>
        <span class="inline-flex items-center gap-1 font-medium text-[var(--color-text)]">
          Ver estadísticas <Icon name="ph:arrow-right-bold" class="size-3.5" />
        </span>
      </div>
    </BaseCard>
  </NuxtLink>

  <BaseCard v-else radius="lg" padding="md" class="flex flex-col gap-3 opacity-60">
    <div class="flex items-center gap-3">
      <span
        class="flex items-center justify-center size-10 rounded-full shrink-0"
        :style="{ background: `color-mix(in oklab, ${meta.colorVar} 18%, transparent)`, color: meta.colorVar }"
      >
        <Icon :name="meta.icon" class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-base font-medium text-[var(--color-text)]">{{ meta.label }}</p>
        <p class="text-micro text-[var(--color-text-faint)]">{{ isComingSoonPlatform(platform) ? 'Próximamente' : 'No conectada' }}</p>
      </div>
    </div>

    <BaseButton v-if="!isComingSoonPlatform(platform)" variant="secondary" size="sm" to="/creator/metrics#conexiones">Conectar</BaseButton>
  </BaseCard>
</template>

<script setup lang="ts">
import type { Platform } from '~/types'
import { platformMeta, formatCompactNumber, isComingSoonPlatform } from '~/utils/mock-data'

/**
 * Una tarjeta por red social en "Tus métricas" — mismo trío de estados que
 * ya usa SocialAccountRow.vue en Redes (conectada / sin conectar /
 * próximamente, para las redes sin OAuth real), pero orientada a mostrar el número, no a
 * gestionar la conexión. `sharePct` pinta una barra fina relativa al total
 * de seguidores verificados — nunca se calcula aquí, lo decide la página
 * (para no repetir esa suma en cada tarjeta). Si está conectada y
 * verificada, la tarjeta entera es un enlace al detalle de esa red
 * (`/creator/metrics/<red>`, ver app/pages/creator/metrics/[platform].vue).
 */
const props = defineProps<{
  platform: Platform
  state: 'connected' | 'disconnected'
  followers?: number
  sharePct?: number
}>()

const meta = computed(() => platformMeta[props.platform])
</script>

<template>
  <NuxtLink
    v-if="state === 'connected'" :to="`/creator/metrics/${platform}`"
    class="block focus-visible:outline-none"
  >
    <BaseCard radius="lg" padding="md" interactive class="flex flex-col gap-3 h-full">
      <div class="flex items-center gap-3">
        <span
          class="flex items-center justify-center size-10 rounded-full shrink-0"
          :style="{ background: `color-mix(in oklab, ${meta.colorVar} 18%, transparent)`, color: meta.colorVar }"
        >
          <Icon :name="meta.icon" class="size-5" />
        </span>
        <p class="min-w-0 flex-1 text-[0.9375rem] font-medium text-[var(--color-text)]">{{ meta.label }}</p>
        <Icon name="ph:caret-right-bold" class="size-4 text-[var(--color-text-faint)] shrink-0" />
      </div>

      <p class="font-sans font-semibold text-[1.75rem] leading-none text-[var(--color-text)]" style="font-variant-numeric: proportional-nums">
        {{ formatCompactNumber(followers ?? 0) }}
      </p>
      <div class="h-1.5 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
        <div class="h-full rounded-full transition-[width] duration-500" :style="{ width: `${sharePct ?? 0}%`, background: meta.colorVar }" />
      </div>
      <p class="text-[0.75rem] text-[var(--color-text-faint)]">{{ Math.round(sharePct ?? 0) }}% de tus seguidores totales · ver detalle</p>
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
        <p class="text-[0.9375rem] font-medium text-[var(--color-text)]">{{ meta.label }}</p>
        <p class="text-[0.75rem] text-[var(--color-text-faint)]">{{ isComingSoonPlatform(platform) ? 'Próximamente' : 'No conectada' }}</p>
      </div>
    </div>

    <BaseButton v-if="!isComingSoonPlatform(platform)" variant="secondary" size="sm" to="/creator/metrics#conexiones">Conectar</BaseButton>
  </BaseCard>
</template>

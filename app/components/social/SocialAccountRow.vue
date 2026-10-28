<script setup lang="ts">
import type { SocialAccount } from '~/types'
import { platformMeta, formatCompactNumber, isComingSoonPlatform } from '~/utils/mock-data'

defineProps<{ account: SocialAccount; busy?: boolean; syncing?: boolean }>()
defineEmits<{ connect: []; disconnect: []; sync: [] }>()
</script>

<template>
  <BaseCard radius="md" padding="md" class="flex items-center gap-4">
    <span
      class="flex items-center justify-center size-11 rounded-full shrink-0"
      :style="{ background: `color-mix(in oklab, ${platformMeta[account.platform].colorVar} 18%, transparent)`, color: platformMeta[account.platform].colorVar }"
    >
      <Icon :name="platformMeta[account.platform].icon" class="size-5" />
    </span>

    <div class="min-w-0 flex-1">
      <p class="text-[0.9375rem] font-medium text-[var(--color-text)]">{{ platformMeta[account.platform].label }}</p>
      <p v-if="isComingSoonPlatform(account.platform)" class="text-[0.8125rem] text-[var(--color-text-faint)]">
        Próximamente · todavía no se puede conectar
      </p>
      <p v-else-if="account.connected" class="text-[0.8125rem] text-[var(--color-text-muted)]">
        {{ account.handle }} · {{ formatCompactNumber(account.followers) }} seguidores
      </p>
      <p v-else class="text-[0.8125rem] text-[var(--color-text-faint)]">No conectada</p>
    </div>

    <span
      v-if="account.connected && account.deltaPct"
      class="hidden sm:inline-flex items-center gap-1 text-[0.8125rem] font-medium text-[var(--color-status-published)]"
    >
      <Icon name="ph:trend-up-bold" class="size-3.5" />
      +{{ account.deltaPct }}%
    </span>

    <span
      v-if="isComingSoonPlatform(account.platform)"
      class="shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-medium bg-[var(--color-ink-overlay)] text-[var(--color-text-faint)]"
    >
      Próximamente
    </span>
    <BaseButton
      v-if="!isComingSoonPlatform(account.platform) && account.connected" variant="ghost" size="sm" icon="ph:arrows-clockwise-bold" icon-only
      :icon-spin="syncing" :disabled="busy || syncing"
      aria-label="Actualizar seguidores" @click="$emit('sync')"
    />
    <BaseButton
      v-if="!isComingSoonPlatform(account.platform) && account.connected" variant="ghost" size="sm" icon="ph:x-bold" icon-only :disabled="busy"
      aria-label="Desconectar" @click="$emit('disconnect')"
    />
    <BaseButton v-else-if="!isComingSoonPlatform(account.platform)" variant="secondary" size="sm" :icon-spin="busy" :disabled="busy" @click="$emit('connect')">
      {{ busy ? 'Conectando…' : 'Conectar' }}
    </BaseButton>
  </BaseCard>
</template>

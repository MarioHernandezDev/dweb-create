<script setup lang="ts">
import { relativeTime } from '~/utils/status'
import type { ChatMessage } from '~/composables/useChat'

withDefaults(defineProps<{ message: ChatMessage; mine: boolean; showTime?: boolean; groupStart?: boolean; seen?: boolean }>(), {
  showTime: true,
  groupStart: true,
  seen: false
})
</script>

<template>
  <div v-if="message.kind === 'system'" class="flex justify-center my-3">
    <span class="text-[0.75rem] text-[var(--color-text-faint)] bg-[var(--color-ink-overlay)] px-3 py-1.5 rounded-full text-center">
      {{ message.body }}
    </span>
  </div>

  <div v-else class="flex" :class="[mine ? 'justify-end' : 'justify-start', groupStart ? 'mt-3' : 'mt-0.5']">
    <OfferCard v-if="message.kind === 'offer' && message.offerId" :offer-id="message.offerId" :mine="mine" />

    <div
      v-else
      class="max-w-[78%] px-3.5 py-2.5 rounded-[var(--radius-md)] text-[0.9375rem]"
      :class="mine ? 'bg-[var(--color-ink-overlay)] text-[var(--color-text)]' : 'bg-[var(--color-primary-500)] text-[var(--color-on-primary)]'"
    >
      <p class="whitespace-pre-wrap break-words">{{ message.body }}</p>
      <p v-if="showTime" class="text-[0.6875rem] mt-1 opacity-70">{{ relativeTime(message.createdAt) }}</p>
    </div>
  </div>

  <p v-if="mine && seen" class="text-right text-[0.6875rem] text-[var(--color-text-faint)] mt-0.5 flex items-center justify-end gap-1">
    <Icon name="ph:checks-bold" class="size-3" />Visto
  </p>
</template>

<script setup lang="ts">
import { relativeTime } from '~/utils/status'
import { systemIcon } from '~/utils/chat-view'
import type { ChatMessage } from '~/composables/useChat'

withDefaults(defineProps<{ message: ChatMessage; mine: boolean; showTime?: boolean; groupStart?: boolean; seen?: boolean; otherName?: string; myRole?: 'creator' | 'partner' }>(), {
  showTime: true,
  groupStart: true,
  seen: false,
  otherName: 'la otra persona',
  myRole: 'creator'
})
</script>

<template>
  <!-- Evento de la plataforma: no es una burbuja (nadie lo escribe), se lee como un hito de la conversación. -->
  <div v-if="message.kind === 'system'" class="my-3 flex justify-center" data-message="system">
    <span class="inline-flex max-w-[90%] items-center gap-2 rounded-full bg-[var(--color-ink-overlay)] px-3.5 py-1.5 text-center text-micro text-[var(--color-text-muted)]">
      <Icon :name="systemIcon(message.body)" class="size-4 shrink-0" :class="systemIcon(message.body) === 'ph:check-circle-fill' ? 'text-[var(--color-status-published)]' : ''" />
      <span>{{ message.body }}</span>
      <span class="shrink-0 text-[var(--color-text-faint)]">· {{ relativeTime(message.createdAt) }}</span>
    </span>
  </div>

  <div v-else class="flex" :class="[mine ? 'justify-end' : 'justify-start', groupStart ? 'mt-3' : 'mt-0.5']" :data-message="message.kind">
    <!-- Una oferta cuyo registro ya no existe (paquete borrado) llega con offer_id null: tarjeta degradada, nunca una burbuja vacía. -->
    <OfferCard v-if="message.kind === 'offer' && message.offerId" :offer-id="message.offerId" :mine="mine" :other-name="otherName" :my-role="myRole" />
    <div v-else-if="message.kind === 'offer'" class="w-full max-w-md rounded-[var(--radius-md)] border border-dashed border-[var(--color-hairline-strong)] p-4 text-sm text-[var(--color-text-muted)]" data-offer-unavailable>
      <p class="inline-flex items-center gap-1.5 font-medium text-[var(--color-text)]"><Icon name="ph:package" class="size-4" /> Esta oferta ya no está disponible</p>
      <p class="mt-1">El paquete se ha borrado. El resto de la conversación no cambia.</p>
    </div>

    <div
      v-else
      class="max-w-[85%] md:max-w-[70%] px-3.5 py-2.5 rounded-[var(--radius-md)] text-base"
      :class="mine ? 'bg-[var(--color-ink-overlay)] text-[var(--color-text)]' : 'bg-[var(--color-primary-500)] text-[var(--color-on-primary)]'"
    >
      <p class="whitespace-pre-wrap break-words">{{ message.body }}</p>
      <p v-if="showTime" class="text-micro mt-1 opacity-70">{{ relativeTime(message.createdAt) }}</p>
    </div>
  </div>

  <p v-if="mine && seen" class="text-right text-micro text-[var(--color-text-faint)] mt-0.5 flex items-center justify-end gap-1" data-seen>
    <Icon name="ph:checks-bold" class="size-3" />Visto
  </p>
</template>

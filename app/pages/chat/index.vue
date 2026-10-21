<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { relativeTime } from '~/utils/status'

// Fuera de /creator y /partner a propósito, igual que inbox.vue — la misma
// pantalla sirve para los dos roles.
useHead({ title: 'Chat' })

const { role, ensureRole } = useMyRole()
const myRole = role.value ?? (await ensureRole()) ?? 'creator'

// Fresco en cada visita (no ensureOnce) — igual que useNotifications en
// TopBar.vue: es una bandeja de conversaciones, tiene que notarse al día
// al volver a entrar, no quedarse con la foto de la primera visita.
const { conversations, typingByConversation, refreshConversations } = useChat()
await refreshConversations()

const router = useRouter()
function open(id: string) {
  router.push(`/chat/${id}`)
}
</script>

<template>
  <AppShell :role="myRole" title="Chat" subtitle="Habla y negocia con otros perfiles">
    <EmptyState
      v-if="!conversations.length"
      icon="ph:chat-circle" title="Sin conversaciones todavía"
      description="Inicia un chat desde el perfil de alguien, o hazle una oferta sobre uno de sus paquetes."
    />
    <div v-else class="flex flex-col gap-2 md:max-w-xl">
      <button v-for="c in conversations" :key="c.id" type="button" class="text-left" @click="open(c.id)">
        <BaseCard radius="lg" padding="md" class="flex items-center gap-3" :class="c.unread && 'border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/[0.06]'">
          <BaseAvatar :initials="initialsFromName(c.otherName)" :hue="hueFromString(c.otherName)" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ c.otherName }}</p>
              <span
                v-if="c.unreadCount > 1"
                class="shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--color-primary-500)] text-[var(--color-on-primary)] text-[0.6875rem] font-semibold"
              >
                {{ c.unreadCount > 99 ? '99+' : c.unreadCount }}
              </span>
              <span v-else-if="c.unread" class="shrink-0 size-2 rounded-full bg-[var(--color-primary-500)]" />
            </div>
            <p v-if="typingByConversation[c.id]" class="text-[0.8125rem] font-medium text-[var(--color-primary-500)] animate-pulse mt-0.5">Escribiendo…</p>
            <p v-else class="text-[0.8125rem] text-[var(--color-text-muted)] truncate mt-0.5">{{ c.lastMessagePreview ?? 'Sin mensajes todavía' }}</p>
          </div>
          <span v-if="c.lastMessageAt" class="shrink-0 text-[0.75rem] text-[var(--color-text-faint)]">{{ relativeTime(c.lastMessageAt) }}</span>
        </BaseCard>
      </button>
    </div>
  </AppShell>
</template>

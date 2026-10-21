<script setup lang="ts">
const props = defineProps<{ title: string; subtitle?: string; role: import('~/types').Role }>()
const router = useRouter()
const route = useRoute()

const showBack = computed(() => route.path.split('/').filter(Boolean).length > 1)

// Se recarga en cada visita (no solo la primera) — es una bandeja de
// entrada, el número tiene que notarse fresco al navegar, no quedarse
// pegado al valor de la primera vez que se montó esta barra.
const { unreadCount, refresh: refreshNotifications } = useNotifications()
refreshNotifications()

// Mismo criterio para el chat, y es también el único punto de montaje fijo
// en toda la app desde el que arrancar la suscripción Realtime una sola vez
// por sesión de pestaña (ver startRealtime() en useChat.ts).
const { unreadCount: chatUnreadCount, refreshUnreadCount: refreshChatUnread, startRealtime, startTypingListener } = useChat()
refreshChatUnread()
startRealtime()
startTypingListener()
</script>

<template>
  <header class="sticky top-0 z-30 flex items-center gap-3 px-5 py-4 md:px-8 md:py-6 bg-[var(--color-ink)]/85 backdrop-blur-md border-b border-[var(--color-hairline)]">
    <button
      v-if="showBack"
      type="button" aria-label="Volver" class="md:hidden -ml-1 size-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)]"
      @click="router.back()"
    >
      <Icon name="ph:arrow-left-bold" class="size-5" />
    </button>
    <NuxtImg v-else src="/img/logo-svg.png" alt="" width="28" height="28" class="md:hidden size-7 shrink-0" />

    <div class="min-w-0 flex-1">
      <h1 class="font-display text-[1.375rem] md:text-[1.75rem] text-[var(--color-text)] truncate">{{ title }}</h1>
      <p v-if="subtitle" class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">{{ subtitle }}</p>
    </div>

    <ProfileSearchBar />

    <NuxtLink to="/chat" aria-label="Chat" class="relative shrink-0 size-9 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-text)]">
      <Icon name="ph:chat-circle-fill" class="size-[1.15rem]" />
      <span
        v-if="chatUnreadCount"
        class="absolute top-1 right-1 min-w-[0.9375rem] h-[0.9375rem] px-1 rounded-full bg-[var(--color-status-alert)] text-white text-[0.625rem] font-semibold leading-[0.9375rem] text-center"
      >
        {{ chatUnreadCount > 9 ? '9+' : chatUnreadCount }}
      </span>
    </NuxtLink>

    <NuxtLink to="/inbox" aria-label="Bandeja de entrada" class="relative shrink-0 size-9 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-text)]">
      <Icon name="ph:tray-fill" class="size-[1.15rem]" />
      <span
        v-if="unreadCount"
        class="absolute top-1 right-1 min-w-[0.9375rem] h-[0.9375rem] px-1 rounded-full bg-[var(--color-status-alert)] text-white text-[0.625rem] font-semibold leading-[0.9375rem] text-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </NuxtLink>

    <NuxtLink :to="`/${role}/profile`" aria-label="Tu perfil" class="shrink-0">
      <BaseAvatar initials="TU" :hue="266" size="sm" />
    </NuxtLink>
  </header>
</template>

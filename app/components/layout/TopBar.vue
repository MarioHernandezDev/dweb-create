<script setup lang="ts">
const props = defineProps<{ title: string; subtitle?: string; role: import('~/types').Role }>()
const router = useRouter()
const { show: showPalette } = useCommandPalette()
// Solo en el navegador (si no, el texto del servidor y el del cliente no coinciden en Mac).
const isMac = ref(false)
onMounted(() => { isMac.value = /Mac|iPhone|iPad/.test(navigator.platform) })
const route = useRoute()

const showBack = computed(() => route.path.split('/').filter(Boolean).length > 1)

// Se recarga al navegar solo si los datos tienen más de 20 s (esta barra se
// monta en cada pantalla): el número se nota fresco sin repetir las consultas
// en cada clic.
//
// Todo esto arranca al montar (solo en el navegador). Antes se lanzaba durante el
// renderizado en el servidor: la respuesta de la base llegaba a media renderización
// y unas barras salían sin contador y otras con él, lo que provocaba el aviso de
// hidratación de Vue («Hydration node mismatch») en todas las pantallas.
const { unreadCount, refreshIfStale: refreshNotifications } = useNotifications()

// Mismo criterio para el chat, y es también el único punto de montaje fijo
// en toda la app desde el que arrancar la suscripción Realtime una sola vez
// por sesión de pestaña (ver startRealtime() en useChat.ts).
const { unreadCount: chatUnreadCount, refreshUnreadCountIfStale: refreshChatUnread, startRealtime, startTypingListener } = useChat()

// «Qué me toca» alimenta el contador de la Bandeja: se calcula un poco después de
// montar (no compite con la carga de la pantalla) y se refresca si tiene > 30 s.
const work = useMyWork()
onMounted(() => {
  refreshNotifications()
  refreshChatUnread()
  startRealtime()
  startTypingListener()
  setTimeout(() => work.refreshIfStale(60_000), 2500)
})

// Ya en caché desde role-guard.global.ts — sin parpadeo.
const { avatarUrl, initials: myInitials, hue: myHue } = useMyAvatar()
</script>

<template>
  <header class="topbar">
    <IconButton v-if="showBack" icon="ph:arrow-left-bold" label="Volver" class="md:hidden -ml-1" @click="router.back()" />
    <BrandMark v-else :wordmark="false" :size="32" label="" class="md:hidden" />

    <div class="min-w-0 flex-1">
      <h1 class="topbar__title">{{ title }}</h1>
      <!-- El subtítulo se oculta en móvil: con volver/logo, título, buscador, chat,
           bandeja y avatar en una sola fila de ~375 px, era el primero en perder sitio. -->
      <p v-if="subtitle" class="topbar__subtitle">{{ subtitle }}</p>
    </div>

    <ProfileSearchBar />

    <!-- Paleta de comandos (también Cmd/Ctrl+K): saltar a una sección, lanzar una acción o buscar sin tocar el ratón. -->
    <button type="button" class="icon-link max-md:hidden" :aria-label="`Buscar y acciones (${isMac ? 'Cmd' : 'Ctrl'} K)`" :title="`Buscar y acciones · ${isMac ? '⌘' : 'Ctrl'} K`" data-open-palette @click="showPalette">
      <Icon name="ph:command-bold" class="size-5" />
    </button>

    <NuxtLink to="/chat" aria-label="Chat" title="Chat" class="icon-link max-md:hidden">
      <Icon name="ph:chat-circle-fill" class="size-5" />
      <span v-if="chatUnreadCount" class="badge badge--on-light badge--corner">{{ chatUnreadCount > 9 ? '9+' : chatUnreadCount }}</span>
    </NuxtLink>

    <NuxtLink to="/inbox" aria-label="Bandeja de entrada" title="Bandeja de entrada" class="icon-link">
      <Icon name="ph:tray-fill" class="size-5" />
      <span v-if="unreadCount" class="badge badge--on-light badge--corner">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </NuxtLink>

    <NuxtLink :to="`/${role}/profile`" aria-label="Perfil" class="shrink-0">
      <BaseAvatar :initials="myInitials" :src="avatarUrl" :hue="myHue" size="sm" />
    </NuxtLink>
  </header>
</template>

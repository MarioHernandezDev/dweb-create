<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { relativeTime } from '~/utils/status'
import { filterConversations, previewText, type ConversationFilter } from '~/utils/chat-view'

/**
 * Bandeja de conversaciones (A-R20a/b): búsqueda por nombre, filtros No leídas
 * y Ofertas pendientes (de MI respuesta), y en cada fila quién es, qué pasó
 * por última vez (con perspectiva), cuántos mensajes sin leer y si hay una
 * oferta esperándome. Todo sale de lo que ya se cargaba más una consulta
 * de solo lectura a `offers`. Sobre las 200 conversaciones más recientes
 * (límite de `useChat`): la búsqueda y los filtros trabajan sobre lo cargado.
 */
const route = useRoute()
const { conversations, conversationsLoaded, typingByConversation, refreshConversations } = useChat()
const { pendingIncomingByConversation, refreshPendingIncoming } = useOffers()

const query = ref('')
const filter = ref<ConversationFilter>('all')
const refreshing = ref(false)

const filters: { value: ConversationFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'No leídas' },
  { value: 'offers', label: 'Ofertas' }
]

const shown = computed(() => filterConversations(conversations.value, { query: query.value, filter: filter.value }, pendingIncomingByConversation.value))
const unreadTotal = computed(() => conversations.value.filter((c) => c.unread).length)
const pendingTotal = computed(() => Object.values(pendingIncomingByConversation.value).filter((n) => n > 0).length)
const activeId = computed(() => route.params.id as string | undefined)

async function load() {
  refreshing.value = true
  await Promise.all([refreshConversations(), refreshPendingIncoming()])
  refreshing.value = false
}

// Red de seguridad: el canal de Realtime se puede cortar en silencio; se refresca al volver
// la pestaña a visible y, por si acaso, cada minuto (antes 20 s: demasiadas consultas).
let pollTimer: ReturnType<typeof setInterval> | undefined
function onVisibility() {
  if (document.visibilityState === 'visible') load()
}
onMounted(() => {
  load()
  pollTimer = setInterval(load, 60_000)
  document.addEventListener('visibilitychange', onVisibility)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisibility)
})

const roleLabel = (r: string) => (r === 'partner' ? 'Empresa' : 'Creador')
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col rounded-[var(--radius-lg)] border border-[var(--color-hairline)] bg-[var(--color-paper)]" data-chat-list>
    <div class="shrink-0 border-b border-[var(--color-hairline)] p-3 flex flex-col gap-2.5">
      <div class="relative">
        <Icon name="ph:magnifying-glass-bold" class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-text-faint)]" />
        <label class="sr-only" for="chat-search">Buscar conversaciones por nombre</label>
        <input
          id="chat-search" v-model="query" type="search" placeholder="Buscar por nombre…"
          class="w-full h-10 pl-8 pr-3 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
        >
      </div>
      <div class="flex gap-1.5" role="group" aria-label="Filtrar conversaciones">
        <button
          v-for="f in filters" :key="f.value" type="button" :aria-pressed="filter === f.value" :data-filter="f.value"
          class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[0.8125rem] font-medium border transition-colors"
          :class="filter === f.value ? 'bg-[var(--color-primary-500)]/12 border-[var(--color-primary-500)]/40 text-[var(--color-primary-500)]' : 'border-[var(--color-hairline)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
          @click="filter = f.value"
        >
          {{ f.label }}
          <span v-if="f.value === 'unread' && unreadTotal" class="text-[0.6875rem] font-semibold">{{ unreadTotal }}</span>
          <span v-if="f.value === 'offers' && pendingTotal" class="text-[0.6875rem] font-semibold">{{ pendingTotal }}</span>
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto nx-scroll" data-chat-list-scroll>
      <div v-if="!conversationsLoaded" class="flex flex-col gap-1 p-2" data-chat-loading aria-busy="true">
        <div v-for="i in 5" :key="i" class="flex items-center gap-3 rounded-[var(--radius-sm)] p-3">
          <SkeletonBlock width="2.5rem" height="2.5rem" rounded="9999px" />
          <div class="flex-1 flex flex-col gap-2"><SkeletonBlock width="55%" height="0.75rem" /><SkeletonBlock width="85%" height="0.625rem" /></div>
        </div>
      </div>

      <EmptyState
        v-else-if="!conversations.length"
        icon="ph:chat-circle" title="Sin conversaciones todavía"
        description="Inicia un chat desde el perfil de alguien en Descubrir, o hazle una oferta sobre uno de sus paquetes."
      >
        <NuxtLink :to="`/${$route.path.startsWith('/partner') ? 'partner' : 'creator'}/discover`" class="text-[0.8125rem] font-medium text-[var(--color-primary-500)] underline underline-offset-2">Ir a Descubrir</NuxtLink>
      </EmptyState>

      <EmptyState
        v-else-if="!shown.length"
        icon="ph:funnel" title="Ninguna conversación coincide"
        :description="filter === 'offers' ? 'No tienes ofertas pendientes de responder.' : filter === 'unread' ? 'No tienes mensajes sin leer.' : 'Prueba con otro nombre.'"
      >
        <BaseButton variant="secondary" size="sm" icon="ph:x-bold" @click="query = ''; filter = 'all'">Quitar filtros</BaseButton>
      </EmptyState>

      <ul v-else class="flex flex-col p-1.5">
        <li v-for="c in shown" :key="c.id">
          <NuxtLink
            :to="`/chat/${c.id}`" :aria-current="activeId === c.id ? 'page' : undefined" data-chat-row :data-conversation="c.id"
            class="flex items-center gap-3 rounded-[var(--radius-sm)] p-3 transition-colors hover:bg-[var(--color-ink-overlay)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary-500)]"
            :class="activeId === c.id ? 'bg-[var(--color-ink-overlay)]' : ''"
          >
            <BaseAvatar :initials="initialsFromName(c.otherName)" :src="c.otherAvatarUrl" :hue="hueFromString(c.otherName)" />
            <span class="min-w-0 flex-1">
              <span class="flex items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate text-[0.9375rem]" :class="c.unread ? 'font-semibold text-[var(--color-text)]' : 'font-medium text-[var(--color-text)]'">{{ c.otherName }}</span>
                  <span class="shrink-0 rounded-full bg-[var(--color-ink-overlay)] px-1.5 text-[0.625rem] font-medium text-[var(--color-text-faint)]">{{ roleLabel(c.otherRole) }}</span>
                </span>
                <span v-if="c.lastMessageAt" class="shrink-0 text-[0.6875rem] text-[var(--color-text-faint)]">{{ relativeTime(c.lastMessageAt) }}</span>
              </span>
              <span class="mt-0.5 flex items-center justify-between gap-2">
                <span v-if="typingByConversation[c.id]" class="truncate text-[0.8125rem] font-medium text-[var(--color-primary-500)]">Escribiendo…</span>
                <span v-else class="truncate text-[0.8125rem]" :class="c.unread ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'">
                  {{ previewText({ kind: c.lastMessageKind, body: c.lastMessagePreview, mine: c.lastMessageMine }) }}
                </span>
                <span class="flex shrink-0 items-center gap-1.5">
                  <span v-if="(pendingIncomingByConversation[c.id] ?? 0) > 0" class="rounded-full bg-[var(--color-status-review)]/15 px-2 text-[0.6875rem] font-semibold text-[var(--color-status-review)]" data-pending-offer>Responder</span>
                  <span v-if="c.unreadCount > 0" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary-500)] px-1.5 text-[0.6875rem] font-semibold text-[var(--color-on-primary)]" data-unread-badge>{{ c.unreadCount > 99 ? '99+' : c.unreadCount }}</span>
                </span>
              </span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

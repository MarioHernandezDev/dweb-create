<script setup lang="ts">
import type { AppNotification } from '~/composables/useNotifications'
import { relativeTime } from '~/utils/status'
import { groupNotifications, type NotificationGroup } from '~/utils/notifications'

useHead({ title: 'Bandeja de entrada' })

// Fuera de /creator y /partner a propósito — la misma pantalla sirve para
// los 2 roles, solo cambia el `role` que le pasamos a AppShell para que la
// barra lateral y la de navegación salgan con el aspecto de la cuenta
// logueada.
const { role, ensureRole } = useMyRole()
const myRole = role.value ?? (await ensureRole()) ?? 'creator'

const { important, activity, ensureLoaded, markRead, markAllRead } = useNotifications()
await ensureLoaded()

const router = useRouter()

// Hallazgo #2: antes era una sola lista, con los inicios de sesión mezclados
// entre solicitudes/ofertas reales. Separado en dos pestañas, con la de
// Importantes por delante (la que importa de verdad) y el contador del
// badge (useNotifications().unreadCount) ya solo cuenta esta.
const tab = ref<'important' | 'activity'>('important')
const tabs = computed(() => [
  { value: 'important', label: important.value.some((n) => !n.readAt) ? `Importantes (${important.value.filter((n) => !n.readAt).length})` : 'Importantes' },
  { value: 'activity', label: 'Actividad' }
])
// M-N1: avisos idénticos se muestran agrupados, con contador.
const visible = computed(() => groupNotifications(tab.value === 'important' ? important.value : activity.value))

const typeIcon: Record<string, string> = {
  welcome: 'ph:hand-waving-fill',
  login: 'ph:sign-in-fill',
  collaboration_requested: 'ph:handshake-fill',
  collaboration_accepted: 'ph:check-circle-fill',
  collaboration_declined: 'ph:x-circle-fill',
  collaboration_completed: 'ph:flag-checkered-fill',
  // 'collaboration_assigned' se retiró al quitar el rol de manager —
  // no queda ningún camino de código que lo vuelva a emitir.
  collaboration_paid: 'ph:currency-eur-fill',
  offer_received: 'ph:tag-fill',
  offer_accepted: 'ph:check-circle-fill',
  offer_declined: 'ph:x-circle-fill'
}

function iconFor(n: AppNotification) {
  return typeIcon[n.type] ?? 'ph:bell-fill'
}

const hasUnread = computed(() => important.value.some((n) => !n.readAt) || activity.value.some((n) => !n.readAt))

async function open(n: NotificationGroup<AppNotification>) {
  await Promise.all(n.ids.map((id) => markRead(id)))
  if (n.link) router.push(n.link)
}
</script>

<template>
  <AppShell :role="myRole" title="Bandeja de entrada" subtitle="Avisos de tu cuenta">
    <div class="list-toolbar">
      <SegmentedTabs v-model="tab" :options="tabs" />
      <BaseButton v-if="hasUnread" variant="ghost" size="sm" icon="ph:checks-bold" @click="markAllRead">Marcar todo como leído</BaseButton>
    </div>

    <EmptyState
      v-if="!visible.length"
      icon="ph:tray" :title="tab === 'important' ? 'Sin avisos importantes' : 'Sin actividad todavía'"
      :description="tab === 'important' ? 'Aquí verás solicitudes, ofertas, cambios pedidos, aprobaciones y valoraciones.' : 'Aquí verás tus inicios de sesión y la bienvenida de alta de cuenta.'"
    />
    <div v-else class="notice-list">
      <button v-for="n in visible" :key="n.id" type="button" class="notice" :class="n.unread && 'is-unread'" @click="open(n)">
        <span class="notice__icon"><Icon :name="iconFor(n)" class="size-5" /></span>
        <span class="notice__head">
          <span class="notice__title">
            {{ n.title }}
            <span v-if="n.count > 1" class="notice__count" :aria-label="`${n.count} avisos iguales`">×{{ n.count }}</span>
          </span>
          <span v-if="n.unread" class="notice__flag">Nuevo</span>
        </span>
        <span v-if="n.body" class="notice__body">{{ n.body }}</span>
        <span class="notice__time">{{ relativeTime(n.createdAt) }}</span>
      </button>
    </div>
  </AppShell>
</template>

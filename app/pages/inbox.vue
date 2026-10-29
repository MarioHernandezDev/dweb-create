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
    <div v-if="hasUnread" class="flex justify-end mb-4">
      <button type="button" class="text-[0.8125rem] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]" @click="markAllRead">
        Marcar todo como leído
      </button>
    </div>

    <SegmentedTabs v-model="tab" :options="tabs" class="mb-4" />

    <EmptyState
      v-if="!visible.length"
      icon="ph:tray" :title="tab === 'important' ? 'Sin avisos importantes' : 'Sin actividad todavía'"
      :description="tab === 'important' ? 'Aquí verás solicitudes, ofertas, cambios pedidos, aprobaciones y valoraciones.' : 'Aquí verás tus inicios de sesión y la bienvenida de alta de cuenta.'"
    />
    <div v-else class="flex flex-col gap-2 md:max-w-xl">
      <button v-for="n in visible" :key="n.id" type="button" class="text-left" @click="open(n)">
        <BaseCard
          radius="lg" padding="md" interactive class="flex items-start gap-3"
          :class="n.unread && 'border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/[0.06]'"
        >
          <span class="flex items-center justify-center size-9 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] shrink-0">
            <Icon :name="iconFor(n)" class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">
                {{ n.title }}
                <span v-if="n.count > 1" class="ml-1 text-[0.75rem] font-normal text-[var(--color-text-faint)]" :aria-label="`${n.count} avisos iguales`">×{{ n.count }}</span>
              </p>
              <span v-if="n.unread" class="shrink-0 size-2 rounded-full bg-[var(--color-primary-500)]" />
            </div>
            <p v-if="n.body" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mt-0.5">{{ n.body }}</p>
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-1">{{ relativeTime(n.createdAt) }}</p>
          </div>
        </BaseCard>
      </button>
    </div>
  </AppShell>
</template>

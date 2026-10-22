<script setup lang="ts">
import type { AppNotification } from '~/composables/useNotifications'
import { relativeTime } from '~/utils/status'

useHead({ title: 'Bandeja de entrada' })

// Fuera de /creator y /partner a propósito — la misma pantalla sirve para
// los 2 roles, solo cambia el `role` que le pasamos a AppShell para que la
// barra lateral y la de navegación salgan con el aspecto de la cuenta
// logueada.
const { role, ensureRole } = useMyRole()
const myRole = role.value ?? (await ensureRole()) ?? 'creator'

const { notifications, ensureLoaded, markRead, markAllRead } = useNotifications()
await ensureLoaded()

const router = useRouter()

const typeIcon: Record<string, string> = {
  welcome: 'ph:hand-waving-fill',
  login: 'ph:sign-in-fill',
  collaboration_requested: 'ph:handshake-fill',
  collaboration_accepted: 'ph:check-circle-fill',
  collaboration_declined: 'ph:x-circle-fill',
  collaboration_assigned: 'ph:briefcase-fill',
  roster_requested: 'ph:users-three-fill',
  roster_accepted: 'ph:check-circle-fill',
  roster_declined: 'ph:x-circle-fill'
}

function iconFor(n: AppNotification) {
  return typeIcon[n.type] ?? 'ph:bell-fill'
}

const hasUnread = computed(() => notifications.value.some((n) => !n.readAt))

async function open(n: AppNotification) {
  await markRead(n.id)
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

    <EmptyState
      v-if="!notifications.length"
      icon="ph:tray" title="Sin avisos todavía"
      description="Aquí verás tus inicios de sesión, altas de cuenta y solicitudes de colaboración o de plantilla."
    />
    <div v-else class="flex flex-col gap-2 md:max-w-xl">
      <button v-for="n in notifications" :key="n.id" type="button" class="text-left" @click="open(n)">
        <BaseCard
          radius="lg" padding="md" interactive class="flex items-start gap-3"
          :class="!n.readAt && 'border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/[0.06]'"
        >
          <span class="flex items-center justify-center size-9 rounded-full bg-[var(--color-ink-overlay)] text-[var(--color-primary-500)] shrink-0">
            <Icon :name="iconFor(n)" class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ n.title }}</p>
              <span v-if="!n.readAt" class="shrink-0 size-2 rounded-full bg-[var(--color-primary-500)]" />
            </div>
            <p v-if="n.body" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mt-0.5">{{ n.body }}</p>
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-1">{{ relativeTime(n.createdAt) }}</p>
          </div>
        </BaseCard>
      </button>
    </div>
  </AppShell>
</template>

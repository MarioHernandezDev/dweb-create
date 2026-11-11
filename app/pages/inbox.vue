<script setup lang="ts">
import type { AppNotification } from '~/composables/useNotifications'
import { relativeTime } from '~/utils/status'
import { initialsFromName, hueFromString } from '~/utils/avatar'
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
// «Qué me toca» va primero: lo accionable (responder, revisar, entregar…) por
// delante de los avisos. Se calcula con el estado real de tus colaboraciones y se
// carga en el cliente para no retrasar la página.
const work = useMyWork()
// Si no hay nada que hacer pero sí avisos sin leer, se abre en los avisos (salvo que la URL pida otra pestaña).
onMounted(async () => {
  await work.load(true)
  if (tab.value === 'tasks' && !route.query.tab && !work.tasks.value.length && important.value.some((n) => !n.readAt)) tab.value = 'important'
})
const taskCount = computed(() => work.tasks.value.length)

const route = useRoute()
const tab = ref<'tasks' | 'important' | 'activity'>(route.query.tab === 'important' || route.query.tab === 'activity' ? route.query.tab : 'tasks')
const tabs = computed(() => [
  { value: 'tasks', label: taskCount.value ? `Qué me toca (${taskCount.value})` : 'Qué me toca' },
  { value: 'important', label: important.value.some((n) => !n.readAt) ? `Importantes (${important.value.filter((n) => !n.readAt).length})` : 'Importantes' },
  { value: 'activity', label: 'Actividad' }
])
// M-N1: avisos idénticos se muestran agrupados, con contador.
const visible = computed(() => groupNotifications(tab.value === 'activity' ? activity.value : important.value))

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
  offer_declined: 'ph:x-circle-fill',
  // Recordatorios de plazo (send_due_reminders, migración 20261109110000).
  collaboration_expiring: 'ph:clock-countdown-fill',
  post_due_soon: 'ph:alarm-fill',
  // Archivos y cancelación pactada (migración 20261110110000).
  collaboration_file_added: 'ph:paperclip-fill',
  collaboration_cancel_requested: 'ph:prohibit-fill',
  collaboration_cancel_declined: 'ph:arrow-bend-up-right-fill',
  collaboration_cancelled: 'ph:prohibit-fill',
  // Terminación por incumplimiento (migración 20261111100000).
  collaboration_terminated: 'ph:warning-octagon-fill'
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
  <AppShell :role="myRole" title="Bandeja de entrada" subtitle="Lo que te toca y los avisos de tu cuenta">
    <div class="list-toolbar">
      <SegmentedTabs v-model="tab" :options="tabs" />
      <BaseButton v-if="hasUnread && tab !== 'tasks'" variant="ghost" size="sm" icon="ph:checks-bold" @click="markAllRead">Marcar todo como leído</BaseButton>
    </div>

    <!-- Qué me toca -->
    <template v-if="tab === 'tasks'">
      <div v-if="!work.loaded.value" class="tasks" aria-busy="true">
        <SkeletonBlock v-for="n in 3" :key="n" height="5rem" rounded="var(--radius-md)" />
      </div>
      <EmptyState
        v-else-if="!work.tasks.value.length"
        icon="ph:check-circle" title="Estás al día"
        description="No hay respuestas, revisiones ni entregas pendientes por tu parte. Cuando algo necesite tu atención, aparecerá aquí."
      />
      <div v-else class="tasks" data-tasks>
        <article v-for="t in work.tasks.value" :key="t.id" class="task" :data-kind="t.kind">
          <div class="task__main">
            <p class="task__who"><BaseAvatar :initials="initialsFromName(t.counterpartName)" :hue="hueFromString(t.counterpartName)" size="sm" /> {{ t.counterpartName }}</p>
            <h2 class="task__title">{{ t.title }}</h2>
            <p v-if="t.detail" class="task__detail">{{ t.detail }}</p>
          </div>
          <BaseButton :to="t.to" variant="primary" size="sm">{{ t.cta }}</BaseButton>
        </article>
      </div>

      <PanelCard v-if="work.loaded.value && work.waiting.value.length" title="Esperando a otros" description="Sin acción por tu parte ahora mismo." class="mt-6">
        <div class="task-waiting">
          <NuxtLink v-for="w in work.waiting.value" :key="w.collaborationId" :to="`/${work.myRole.value}/collaborations/${w.collaborationId}`" class="task-waiting__row">
            <span>{{ w.text }}</span><Icon name="ph:arrow-right-bold" class="size-4" />
          </NuxtLink>
        </div>
      </PanelCard>
    </template>

    <EmptyState
      v-else-if="!visible.length"
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

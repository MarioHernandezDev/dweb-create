<script setup lang="ts">
import { roleNav, secondaryNav } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ role: Role }>()
const route = useRoute()
const items = computed(() => roleNav[props.role])

// Barra inferior en móvil: 3 destinos del rol + Chat + "Más". Chat sube a la barra
// (A-R20, aprobado) porque es donde llegan ofertas y mensajes que esperan respuesta;
// 6 pestañas compitiendo por el mismo ancho es lo que las convenciones desaconsejan.
// El sidebar de escritorio (SideRail.vue) sigue mostrando todo.
const ROLE_VISIBLE = 3
const chatItem = computed(() => secondaryNav(props.role).find((i) => i.to === '/chat')!)
const visibleItems = computed(() => [...items.value.slice(0, ROLE_VISIBLE), chatItem.value])
const overflowItems = computed(() => items.value.slice(ROLE_VISIBLE))
const moreOpen = ref(false)

// "Más" reúne lo que sobra del rol (si lo hay) + los accesos secundarios
// (Chat/Bandeja/Guardados/Ajustes) — antes el partner, con solo 3 destinos
// de rol, no tenía "Más" en absoluto y esos 4 accesos no existían en ningún
// menú (auditoría de usabilidad, sección 2.2).
const moreItems = computed(() => [...overflowItems.value, ...secondaryNav(props.role).filter((i) => i.to !== '/chat')])

function isActive(to: string) {
  return to === items.value[0]?.to ? route.path === to : route.path.startsWith(to)
}
const moreActive = computed(() => moreItems.value.some((item) => isActive(item.to)))

const inboxUnread = useInboxBadge()
const { unreadCount: chatUnread } = useChat()
const badgeFor: Record<string, Readonly<Ref<number>>> = { '/chat': chatUnread, '/inbox': inboxUnread }
const badgeCount = (to: string) => badgeFor[to]?.value ?? 0
const moreBadgeTotal = computed(() => inboxUnread.value)

// Hallazgo #5 de la auditoría de usabilidad: "cerrar sesión" estaba
// enterrado (Más → Ajustes → pestaña Cuenta → bajar al final). Ahora está
// aquí mismo, a un toque desde "Más" en cualquier pantalla.
const { confirm } = useConfirm()
const { logout } = useLogout()
async function confirmLogout() {
  moreOpen.value = false
  const ok = await confirm({ title: '¿Cerrar sesión?', confirmLabel: 'Cerrar sesión' })
  if (ok) await logout()
}
</script>

<template>
  <nav class="tabbar" aria-label="Navegación principal">
    <ul class="tabbar__list">
      <li v-for="item in visibleItems" :key="item.to">
        <NuxtLink
          :to="item.to" class="tabbar__item" :class="isActive(item.to) && 'is-active'" :data-tour="`nav:${item.to}`"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <Icon :name="item.icon" class="tabbar__icon" />
          <span class="tabbar__label">{{ item.label }}</span>
          <span v-if="badgeCount(item.to) && !isActive(item.to)" class="badge badge--corner" data-tab-badge>{{ badgeCount(item.to) > 9 ? '9+' : badgeCount(item.to) }}</span>
        </NuxtLink>
      </li>
      <li>
        <button
          type="button" class="tabbar__item" :class="moreActive && 'is-active'" data-tour="account"
          aria-haspopup="true" :aria-expanded="moreOpen" @click="moreOpen = true"
        >
          <Icon name="ph:dots-three-bold" class="tabbar__icon" />
          <span class="tabbar__label">Más</span>
          <span v-if="moreBadgeTotal && !moreActive" class="badge badge--corner">{{ moreBadgeTotal > 9 ? '9+' : moreBadgeTotal }}</span>
        </button>
      </li>
    </ul>

    <BottomSheet v-model="moreOpen" title="Más">
      <div class="flex flex-col gap-1 -mx-1">
        <NuxtLink
          v-for="item in moreItems" :key="item.to" :to="item.to"
          class="flex items-center gap-3 px-3 h-12 rounded-[var(--radius-sm)] transition-colors duration-150"
          :class="isActive(item.to) ? 'bg-[var(--color-voltio-200)] text-[var(--color-tinta-950)]' : 'text-[var(--color-text)] hover:bg-[var(--surface-sunken)]'"
          @click="moreOpen = false"
        >
          <Icon :name="item.icon" class="size-5 shrink-0" />
          <span class="font-semibold flex-1">{{ item.label }}</span>
          <span v-if="item.soon" class="soon-tag">Pronto</span>
          <span v-if="badgeCount(item.to)" class="badge badge--on-light">{{ badgeCount(item.to) > 9 ? '9+' : badgeCount(item.to) }}</span>
        </NuxtLink>
        <button
          type="button" class="flex items-center gap-3 px-3 h-12 rounded-[var(--radius-sm)] text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)] transition-colors duration-150"
          @click="confirmLogout"
        >
          <Icon name="ph:sign-out-bold" class="size-5 shrink-0" />
          <span class="font-semibold">Cerrar sesión</span>
        </button>
      </div>
    </BottomSheet>
  </nav>
</template>

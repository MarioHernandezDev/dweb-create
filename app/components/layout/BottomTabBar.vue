<script setup lang="ts">
import { roleNav, secondaryNav } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ role: Role }>()
const route = useRoute()
const items = computed(() => roleNav[props.role])

// Como mucho 4 pestañas a la vista + "Más" cuando sobra alguna — 6 pestañas
// compitiendo por el mismo ancho (caso del creador: Hoy/Tablero/Descubrir/
// Colaboraciones/Redes/Métricas) es justo lo que las convenciones de
// plataforma desaconsejan. El sidebar de escritorio (SideRail.vue) sigue
// mostrando las 6 — esto es solo el recorte para la barra inferior en móvil.
const MAX_VISIBLE = 4
const visibleItems = computed(() => items.value.slice(0, MAX_VISIBLE))
const overflowItems = computed(() => items.value.slice(MAX_VISIBLE))
const moreOpen = ref(false)

// "Más" reúne lo que sobra del rol (si lo hay) + los accesos secundarios
// (Chat/Bandeja/Guardados/Ajustes) — antes el partner, con solo 3 destinos
// de rol, no tenía "Más" en absoluto y esos 4 accesos no existían en ningún
// menú (auditoría de usabilidad, sección 2.2).
const moreItems = computed(() => [...overflowItems.value, ...secondaryNav(props.role)])

function isActive(to: string) {
  return to === items.value[0]?.to ? route.path === to : route.path.startsWith(to)
}
const moreActive = computed(() => moreItems.value.some((item) => isActive(item.to)))

const { unreadCount: inboxUnread } = useNotifications()
const { unreadCount: chatUnread } = useChat()
const badgeFor: Record<string, import('vue').ComputedRef<number>> = { '/chat': chatUnread, '/inbox': inboxUnread }
const moreBadgeTotal = computed(() => chatUnread.value + inboxUnread.value)
</script>

<template>
  <nav
    class="md:hidden fixed bottom-0 inset-x-0 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 px-2 bg-[var(--color-ink)]/92 backdrop-blur-md border-t border-[var(--color-hairline)]"
    aria-label="Navegación principal"
  >
    <ul class="flex items-stretch justify-between">
      <li v-for="item in visibleItems" :key="item.to" class="flex-1">
        <NuxtLink
          :to="item.to"
          class="flex flex-col items-center gap-1 py-1.5 rounded-[var(--radius-sm)] transition-colors duration-200"
          :class="isActive(item.to) ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-faint)]'"
        >
          <span
            class="flex items-center justify-center size-8 rounded-full transition-[background-color,transform] duration-300 ease-[var(--ease-spring-out)]"
            :class="isActive(item.to) ? 'bg-[var(--color-primary-500)]/12 scale-100' : 'scale-90'"
          >
            <Icon :name="item.icon" class="size-[1.35rem] transition-transform duration-300 ease-[var(--ease-spring-out)]" :class="isActive(item.to) && 'scale-110'" />
          </span>
          <span class="text-[0.6875rem] font-medium">{{ item.label }}</span>
        </NuxtLink>
      </li>
      <li class="flex-1">
        <button
          type="button" class="relative w-full flex flex-col items-center gap-1 py-1.5 rounded-[var(--radius-sm)] transition-colors duration-200"
          :class="moreActive ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-faint)]'"
          aria-haspopup="true" :aria-expanded="moreOpen" @click="moreOpen = true"
        >
          <span
            class="relative flex items-center justify-center size-8 rounded-full transition-[background-color,transform] duration-300 ease-[var(--ease-spring-out)]"
            :class="moreActive ? 'bg-[var(--color-primary-500)]/12 scale-100' : 'scale-90'"
          >
            <Icon name="ph:dots-three-bold" class="size-[1.35rem]" />
            <span
              v-if="moreBadgeTotal"
              class="absolute top-0 right-0 min-w-[0.9375rem] h-[0.9375rem] px-1 rounded-full bg-[var(--color-status-alert)] text-white text-[0.625rem] font-semibold leading-[0.9375rem] text-center"
            >
              {{ moreBadgeTotal > 9 ? '9+' : moreBadgeTotal }}
            </span>
          </span>
          <span class="text-[0.6875rem] font-medium">Más</span>
        </button>
      </li>
    </ul>

    <BottomSheet v-model="moreOpen" title="Más">
      <div class="flex flex-col gap-1 -mx-1">
        <NuxtLink
          v-for="item in moreItems" :key="item.to" :to="item.to"
          class="flex items-center gap-3 px-3 h-12 rounded-[var(--radius-sm)] transition-colors duration-150"
          :class="isActive(item.to) ? 'bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)]' : 'text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)]'"
          @click="moreOpen = false"
        >
          <Icon :name="item.icon" class="size-5 shrink-0" />
          <span class="text-[0.9375rem] font-medium flex-1">{{ item.label }}</span>
          <span v-if="badgeFor[item.to]?.value" class="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[var(--color-status-alert)] text-white text-[0.6875rem] font-semibold leading-[1.125rem] text-center">
            {{ badgeFor[item.to].value > 9 ? '9+' : badgeFor[item.to].value }}
          </span>
        </NuxtLink>
      </div>
    </BottomSheet>
  </nav>
</template>

<script setup lang="ts">
import { roleNav, roleMeta, secondaryNav } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ role: Role }>()
const route = useRoute()
const items = computed(() => roleNav[props.role])

// Solo Chat/Bandeja/Guardados — "Ajustes" ya tiene su propio bloque más
// abajo (avatar + nombre de cuenta), no hace falta repetirlo.
const secondaryItems = computed(() => secondaryNav(props.role).slice(0, 3))

function isActive(to: string) {
  return to === items.value[0]?.to ? route.path === to : route.path.startsWith(to)
}

// Mismas cachés que ya usa TopBar.vue para los contadores — se lee el
// estado ya cargado, sin disparar un segundo `refresh()` (TopBar ya se
// monta en cada página y lo mantiene al día).
const { unreadCount: inboxUnread } = useNotifications()
const { unreadCount: chatUnread } = useChat()
const badgeFor: Record<string, import('vue').ComputedRef<number>> = { '/chat': chatUnread, '/inbox': inboxUnread }

// Ya en caché desde role-guard.global.ts — sin parpadeo.
const { avatarUrl, initials: myInitials, hue: myHue } = useMyAvatar()

// Nombre real en vez de la etiqueta genérica "Tu cuenta" — el mismo que ya
// se ve en el chat/Descubrir/perfil público (display_name/company_name de
// la ficha, no el full_name de `profiles`, que es solo un respaldo interno).
const { creator } = useMyCreator()
const { partner } = useMyPartner()
const accountName = computed(() => (props.role === 'creator' ? creator.value?.displayName : partner.value?.name) || 'Tu cuenta')
</script>

<template>
  <aside class="hidden md:flex md:flex-col w-64 shrink-0 h-dvh sticky top-0 px-5 py-7 bg-[var(--color-primary-900)]">
    <NuxtLink to="/" class="flex items-center gap-2.5 px-1.5 mb-9">
      <NuxtImg src="/img/logo-svg.png" alt="" width="32" height="32" class="size-8" />
      <span class="font-display text-[1.125rem] text-white">FEEDMA</span>
    </NuxtLink>

    <nav class="flex flex-col gap-1" aria-label="Navegación principal">
      <NuxtLink
        v-for="item in items" :key="item.to" :to="item.to"
        class="flex items-center gap-3 px-3.5 h-11 rounded-[var(--radius-sm)] text-[0.9375rem] font-medium transition-[background-color,color] duration-200 ease-[var(--ease-spring)]"
        :class="isActive(item.to) ? 'bg-white/12 text-white' : 'text-white/65 hover:text-white hover:bg-white/8'"
      >
        <Icon
          :name="item.icon" class="size-[1.15rem] transition-[color,transform] duration-200 ease-[var(--ease-spring-out)]"
          :class="isActive(item.to) && 'text-[var(--color-primary-200)] scale-110'"
        />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="mt-auto pt-5 border-t border-white/12">
      <NuxtLink :to="`/${role}/profile`" class="flex items-center gap-3 px-2 py-2 rounded-[var(--radius-sm)] hover:bg-white/8 transition-colors">
        <BaseAvatar :initials="myInitials" :src="avatarUrl" :hue="myHue" size="sm" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-white truncate">{{ accountName }}</p>
          <p class="text-[0.75rem] text-white/55 truncate">{{ roleMeta[role].label }}</p>
        </div>
      </NuxtLink>

      <nav class="flex flex-col gap-0.5 mt-2" aria-label="Accesos secundarios">
        <NuxtLink
          v-for="item in secondaryItems" :key="item.to" :to="item.to"
          class="flex items-center gap-3 px-3.5 h-9 rounded-[var(--radius-sm)] text-[0.8125rem] font-medium text-white/55 hover:text-white hover:bg-white/8 transition-colors"
        >
          <Icon :name="item.icon" class="size-4" />
          {{ item.label }}
          <span v-if="badgeFor[item.to]?.value" class="ml-auto min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[var(--color-status-alert)] text-white text-[0.625rem] font-semibold leading-[1.125rem] text-center">
            {{ badgeFor[item.to].value > 9 ? '9+' : badgeFor[item.to].value }}
          </span>
        </NuxtLink>
      </nav>
    </div>
  </aside>
</template>

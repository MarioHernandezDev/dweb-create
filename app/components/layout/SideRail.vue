<script setup lang="ts">
import { roleNav, roleMeta, secondaryNav } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ role: Role }>()
const { collapsed, toggle: toggleRail } = useRailState()
const route = useRoute()
const items = computed(() => roleNav[props.role])

// Solo Chat/Bandeja/Guardados — "Perfil" ya tiene su propio bloque más
// abajo (avatar + nombre de cuenta), no hace falta repetirlo.
const secondaryItems = computed(() => secondaryNav(props.role).slice(0, 3))

function isActive(to: string) {
  return to === items.value[0]?.to ? route.path === to : route.path.startsWith(to)
}

// Mismas cachés que ya usa TopBar.vue para los contadores — se lee el
// estado ya cargado, sin disparar un segundo `refresh()` (TopBar ya se
// monta en cada página y lo mantiene al día).
const inboxUnread = useInboxBadge()
const { unreadCount: chatUnread } = useChat()
const badgeFor: Record<string, Readonly<Ref<number>>> = { '/chat': chatUnread, '/inbox': inboxUnread }
const badgeCount = (to: string) => badgeFor[to]?.value ?? 0

// Ya en caché desde role-guard.global.ts — sin parpadeo.
const { avatarUrl, initials: myInitials, hue: myHue } = useMyAvatar()

// Nombre real en vez de la etiqueta genérica "Tu cuenta" — el mismo que ya
// se ve en el chat/Descubrir/perfil público (display_name/company_name de
// la ficha, no el full_name de `profiles`, que es solo un respaldo interno).
const { creator } = useMyCreator()
const { partner } = useMyPartner()
const accountName = computed(() => (props.role === 'creator' ? creator.value?.displayName : partner.value?.name) || 'Tu cuenta')

// Hallazgo #5: antes solo se podía cerrar sesión desde dentro de Perfil →
// pestaña Cuenta, bajando hasta el final. Aquí está siempre a un toque.
const { confirm } = useConfirm()
const { logout } = useLogout()
async function confirmLogout() {
  const ok = await confirm({ title: '¿Cerrar sesión?', confirmLabel: 'Cerrar sesión' })
  if (ok) await logout()
}
</script>

<template>
  <aside class="rail" id="rail" aria-label="Menú lateral">
    <div class="rail__head">
      <NuxtLink to="/" class="rail__brand" aria-label="CIBERAN, inicio">
        <BrandMark tone="light" :size="34" label="" />
      </NuxtLink>
      <button
        type="button" class="rail__toggle" :aria-expanded="!collapsed" aria-controls="rail"
        :aria-label="collapsed ? 'Desplegar menú' : 'Plegar menú'" :title="collapsed ? 'Desplegar menú' : 'Plegar menú'"
        @click="toggleRail"
      >
        <Icon name="ph:caret-double-left-bold" class="rail__toggle-icon" />
      </button>
    </div>

    <nav class="rail__nav" aria-label="Navegación principal">
      <NuxtLink
        v-for="item in items" :key="item.to" :to="item.to"
        class="rail__link" :class="isActive(item.to) && 'is-active'" :title="collapsed ? item.label : undefined"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <Icon :name="item.icon" class="rail__link-icon" />
        <span class="rail__label">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="rail__foot">
      <NuxtLink :to="`/${role}/profile`" class="rail__account" :title="collapsed ? accountName : undefined">
        <BaseAvatar :initials="myInitials" :src="avatarUrl" :hue="myHue" size="sm" />
        <div class="rail__text min-w-0">
          <p class="rail__account-name truncate">{{ accountName }}</p>
          <p class="rail__account-role truncate">{{ roleMeta[role].label }}</p>
        </div>
      </NuxtLink>

      <nav class="rail__secondary" aria-label="Accesos secundarios">
        <NuxtLink
          v-for="item in secondaryItems" :key="item.to" :to="item.to"
          class="rail__link rail__link--small" :class="isActive(item.to) && 'is-active'" :title="collapsed ? item.label : undefined"
        >
          <Icon :name="item.icon" class="size-4 shrink-0" />
          <span class="rail__label">{{ item.label }}</span>
          <span v-if="badgeCount(item.to)" class="badge ml-auto">{{ badgeCount(item.to) > 9 ? '9+' : badgeCount(item.to) }}</span>
        </NuxtLink>
        <button type="button" class="rail__link rail__link--small" :title="collapsed ? 'Cerrar sesión' : undefined" @click="confirmLogout">
          <Icon name="ph:sign-out-bold" class="size-4 shrink-0" />
          <span class="rail__label">Cerrar sesión</span>
        </button>
      </nav>
    </div>
  </aside>
</template>

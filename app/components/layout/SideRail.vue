<script setup lang="ts">
import { roleNav, roleMeta, secondaryNav } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ role: Role }>()
const { pref, toggle: toggleRail } = useRailState()
const route = useRoute()
const items = computed(() => roleNav[props.role])

// Guardados y Ayuda. Chat y Bandeja ya tienen su icono (con contador) en la barra
// superior: tenerlos también aquí era el mismo destino por dos caminos. «Perfil»
// tiene su propio bloque más abajo (avatar + nombre de cuenta).
const secondaryItems = computed(() => secondaryNav(props.role).filter((i) => i.to === '/favorites' || i.to === '/ayuda'))

function isActive(to: string) {
  return to === items.value[0]?.to ? route.path === to : route.path.startsWith(to)
}

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
        type="button" class="rail__toggle" :aria-expanded="pref !== 'collapsed'" aria-controls="rail"
        aria-label="Plegar o desplegar el menú" title="Plegar o desplegar el menú"
        @click="toggleRail"
      >
        <Icon name="ph:caret-double-left-bold" class="rail__toggle-icon" />
      </button>
    </div>

    <nav class="rail__nav" aria-label="Navegación principal">
      <NuxtLink
        v-for="item in items" :key="item.to" :to="item.to"
        class="rail__link" :class="isActive(item.to) && 'is-active'" :title="item.label" :data-tour="`nav:${item.to}`"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <Icon :name="item.icon" class="rail__link-icon" />
        <span class="rail__label">{{ item.label }}</span>
        <span v-if="item.soon" class="soon-tag rail__label">Pronto</span>
      </NuxtLink>
    </nav>

    <div class="rail__foot">
      <NuxtLink :to="`/${role}/profile`" class="rail__account" :title="accountName" data-tour="account">
        <BaseAvatar :initials="myInitials" :src="avatarUrl" :hue="myHue" size="sm" />
        <div class="rail__text min-w-0">
          <p class="rail__account-name truncate">{{ accountName }}</p>
          <p class="rail__account-role truncate">{{ roleMeta[role].label }}</p>
        </div>
      </NuxtLink>

      <nav class="rail__secondary" aria-label="Accesos secundarios">
        <NuxtLink
          v-for="item in secondaryItems" :key="item.to" :to="item.to"
          class="rail__link rail__link--small" :class="isActive(item.to) && 'is-active'" :title="item.label"
        >
          <Icon :name="item.icon" class="size-4 shrink-0" />
          <span class="rail__label">{{ item.label }}</span>
        </NuxtLink>
        <button type="button" class="rail__link rail__link--small" title="Cerrar sesión" @click="confirmLogout">
          <Icon name="ph:sign-out-bold" class="size-4 shrink-0" />
          <span class="rail__label">Cerrar sesión</span>
        </button>
      </nav>
    </div>
  </aside>
</template>

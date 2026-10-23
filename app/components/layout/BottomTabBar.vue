<script setup lang="ts">
import { roleNav } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ role: Role }>()
const route = useRoute()
const items = computed(() => roleNav[props.role])

// Como mucho 4 pestañas a la vista + "Más" cuando sobra alguna — 6 pestañas
// compitiendo por el mismo ancho (caso del creador: Hoy/Tablero/Descubrir/
// Solicitudes/Redes/Métricas) es justo lo que las convenciones de plataforma
// desaconsejan. El sidebar de escritorio (SideRail.vue) sigue mostrando las
// 6 — esto es solo el recorte para la barra inferior en móvil.
const MAX_VISIBLE = 4
const visibleItems = computed(() => items.value.slice(0, MAX_VISIBLE))
const overflowItems = computed(() => items.value.slice(MAX_VISIBLE))
const moreOpen = ref(false)

function isActive(to: string) {
  return to === items.value[0]?.to ? route.path === to : route.path.startsWith(to)
}
const overflowActive = computed(() => overflowItems.value.some((item) => isActive(item.to)))
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
      <li v-if="overflowItems.length" class="flex-1">
        <button
          type="button" class="w-full flex flex-col items-center gap-1 py-1.5 rounded-[var(--radius-sm)] transition-colors duration-200"
          :class="overflowActive ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-faint)]'"
          aria-haspopup="true" :aria-expanded="moreOpen" @click="moreOpen = true"
        >
          <span
            class="flex items-center justify-center size-8 rounded-full transition-[background-color,transform] duration-300 ease-[var(--ease-spring-out)]"
            :class="overflowActive ? 'bg-[var(--color-primary-500)]/12 scale-100' : 'scale-90'"
          >
            <Icon name="ph:dots-three-bold" class="size-[1.35rem]" />
          </span>
          <span class="text-[0.6875rem] font-medium">Más</span>
        </button>
      </li>
    </ul>

    <BottomSheet v-model="moreOpen" title="Más">
      <div class="flex flex-col gap-1 -mx-1">
        <NuxtLink
          v-for="item in overflowItems" :key="item.to" :to="item.to"
          class="flex items-center gap-3 px-3 h-12 rounded-[var(--radius-sm)] transition-colors duration-150"
          :class="isActive(item.to) ? 'bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)]' : 'text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)]'"
          @click="moreOpen = false"
        >
          <Icon :name="item.icon" class="size-5 shrink-0" />
          <span class="text-[0.9375rem] font-medium">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </BottomSheet>
  </nav>
</template>

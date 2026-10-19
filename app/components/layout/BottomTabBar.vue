<script setup lang="ts">
import { roleNav } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ role: Role }>()
const route = useRoute()
const items = computed(() => roleNav[props.role])

function isActive(to: string) {
  return to === items.value[0]?.to ? route.path === to : route.path.startsWith(to)
}
</script>

<template>
  <nav
    class="md:hidden fixed bottom-0 inset-x-0 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 px-2 bg-[var(--color-ink)]/92 backdrop-blur-md border-t border-[var(--color-hairline)]"
    aria-label="Navegación principal"
  >
    <ul class="flex items-stretch justify-between">
      <li v-for="item in items" :key="item.to" class="flex-1">
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
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { roleNav, roleMeta } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ role: Role }>()
const route = useRoute()
const items = computed(() => roleNav[props.role])

function isActive(to: string) {
  return to === items.value[0]?.to ? route.path === to : route.path.startsWith(to)
}
</script>

<template>
  <aside class="hidden md:flex md:flex-col w-64 shrink-0 h-dvh sticky top-0 border-r border-[var(--color-hairline)] px-5 py-7">
    <NuxtLink to="/" class="flex items-center gap-2.5 px-1.5 mb-9">
      <span class="flex items-center justify-center size-8 rounded-[0.625rem] bg-[var(--color-flame-500)] text-[var(--color-on-flame)]">
        <BrandMark class="size-4.5" />
      </span>
      <span class="font-display text-[1.125rem] text-[var(--color-text)]">FEEDMA</span>
    </NuxtLink>

    <nav class="flex flex-col gap-1" aria-label="Navegación principal">
      <NuxtLink
        v-for="item in items" :key="item.to" :to="item.to"
        class="flex items-center gap-3 px-3.5 h-11 rounded-[var(--radius-sm)] text-[0.9375rem] font-medium transition-[background-color,color] duration-200 ease-[var(--ease-spring)]"
        :class="isActive(item.to)
          ? 'bg-[var(--color-ink-overlay)] text-[var(--color-text)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)]/60'"
      >
        <Icon :name="item.icon" class="size-[1.15rem] transition-[color,transform] duration-200 ease-[var(--ease-spring-out)]" :class="isActive(item.to) && 'text-[var(--color-flame-500)] scale-110'" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="mt-auto pt-5 border-t border-[var(--color-hairline)]">
      <NuxtLink :to="`/${role}/profile`" class="flex items-center gap-3 px-2 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-ink-overlay)]/60 transition-colors">
        <BaseAvatar initials="TU" :hue="266" size="sm" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-[var(--color-text)] truncate">Tu cuenta</p>
          <p class="text-[0.75rem] text-[var(--color-text-faint)] truncate">{{ roleMeta[role].label }}</p>
        </div>
      </NuxtLink>
    </div>
  </aside>
</template>

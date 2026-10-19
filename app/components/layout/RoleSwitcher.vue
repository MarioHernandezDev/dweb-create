<script setup lang="ts">
import { roleMeta } from '~/utils/nav'
import type { Role } from '~/types'

const props = defineProps<{ current: Role }>()
const roles: Role[] = ['manager', 'creator', 'client']
</script>

<template>
  <BaseCard radius="lg" padding="lg">
    <p class="text-[0.9375rem] font-medium text-[var(--color-text)]">Modo demo</p>
    <p class="text-[0.8125rem] text-[var(--color-text-muted)] mt-1 mb-4 leading-relaxed">
      Todavía no hay inicio de sesión. Cambia de vista para comparar cómo se ve la app para cada tipo de usuario.
    </p>
    <div class="flex flex-col gap-2">
      <NuxtLink
        v-for="role in roles" :key="role" :to="roleMeta[role].home"
        class="flex items-center gap-3 px-3.5 h-12 rounded-[var(--radius-sm)] border transition-colors"
        :class="role === current
          ? 'border-[var(--color-flame-500)]/50 bg-[var(--color-flame-500)]/[0.08]'
          : 'border-[var(--color-hairline)] hover:border-[var(--color-hairline-strong)]'"
      >
        <Icon :name="roleMeta[role].icon" class="size-4.5" :class="role === current ? 'text-[var(--color-flame-500)]' : 'text-[var(--color-text-faint)]'" />
        <span class="text-[0.9375rem]" :class="role === current ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text-muted)]'">
          {{ roleMeta[role].label }}
        </span>
        <Icon v-if="role === current" name="ph:check-circle-fill" class="size-4 ml-auto text-[var(--color-flame-500)]" />
      </NuxtLink>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import type { Role } from '~/types'

defineProps<{ role: Role; title: string; subtitle?: string; fullWidth?: boolean }>()
</script>

<template>
  <div class="min-h-dvh md:flex">
    <SideRail :role="role" />

    <div class="flex-1 min-w-0">
      <TopBar :role="role" :title="title" :subtitle="subtitle" />
      <main class="px-5 py-5 md:px-8 md:py-8 pb-28 md:pb-12" :class="fullWidth ? 'max-w-none' : 'max-w-[1100px]'">
        <slot />
      </main>
    </div>

    <BottomTabBar :role="role" />
    <ConfirmDialogHost />
  </div>
</template>

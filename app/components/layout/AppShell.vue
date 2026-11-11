<script setup lang="ts">
import type { Role } from '~/types'

// `fullWidth` se conserva por compatibilidad: ahora todas las pantallas ocupan todo el ancho.
defineProps<{ role: Role; title: string; subtitle?: string; fullWidth?: boolean }>()

const { collapsed } = useRailState()
</script>

<template>
  <div class="shell" :data-rail="collapsed ? 'collapsed' : 'open'">
    <div class="shell__rail"><SideRail :role="role" /></div>

    <div class="shell__main">
      <TopBar :role="role" :title="title" :subtitle="subtitle" />
      <main class="shell__content">
        <slot />
      </main>
    </div>

    <BottomTabBar :role="role" />
    <ConfirmDialogHost />
    <ToastHost />
    <OnboardingTour />
    <TermsGate />
  </div>
</template>

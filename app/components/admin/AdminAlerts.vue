<script setup lang="ts">
export interface AdminAlertItem { id: string; level: 'warning' | 'danger'; title: string; detail: string; tab: string; query?: Record<string, string> }
defineProps<{ alerts: AdminAlertItem[] }>()
defineEmits<{ open: [alert: AdminAlertItem] }>()
</script>

<template>
  <div v-if="alerts.length" class="grid gap-2 mb-6" data-admin-alerts role="region" aria-label="Alertas del panel">
    <div
      v-for="a in alerts" :key="a.id" data-admin-alert :data-level="a.level"
      class="flex items-start gap-3 rounded-[var(--radius-lg)] border p-3.5"
      :class="a.level === 'danger' ? 'border-[var(--color-status-alert)]/40 bg-[var(--color-status-alert)]/8' : 'border-[var(--color-logo-amber)]/50 bg-[var(--color-logo-amber)]/10'"
    >
      <Icon :name="a.level === 'danger' ? 'ph:warning-octagon-fill' : 'ph:warning-fill'" class="size-5 shrink-0 mt-0.5" :class="a.level === 'danger' ? 'text-[var(--color-status-alert)]' : 'text-[var(--color-logo-amber)]'" />
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-[var(--color-text)]">{{ a.title }}</p>
        <p class="text-micro text-[var(--color-text-muted)]">{{ a.detail }}</p>
      </div>
      <BaseButton variant="outline" size="sm" class="shrink-0" @click="$emit('open', a)">Ver</BaseButton>
    </div>
  </div>
</template>

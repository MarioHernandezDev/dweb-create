<script setup lang="ts">
/** Barra de "ficha completa al X%" — mismo patrón visual que el objetivo semanal de creator/index.vue. Anima a rellenar bio/categorías/tarifas/paquetes porque de verdad mejora el matching (ver copy ya existente en la ficha pública). */
defineProps<{ percent: number }>()
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center justify-between mb-1.5">
      <p class="text-[0.8125rem] font-medium text-[var(--color-text-muted)]">
        Tu ficha está completa al <span class="text-[var(--color-text)] font-semibold">{{ percent }}%</span>
      </p>
      <Icon v-if="percent >= 100" name="ph:check-circle-fill" class="size-4 text-[var(--color-status-published)]" />
    </div>
    <div class="h-2 rounded-full bg-[var(--color-ink-overlay)] overflow-hidden">
      <div
        class="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-spring)]"
        :class="percent >= 100 ? 'bg-[var(--color-status-published)]' : 'bg-[var(--color-primary-500)]'"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>

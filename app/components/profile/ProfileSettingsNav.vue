<script setup lang="ts">
/**
 * Navegación de las pestañas de "Tu Perfil" — menú lateral en escritorio
 * (igual de criterio que SideRail.vue: `hidden md:flex`), tira horizontal
 * con scroll en móvil (no cabe un menú lateral en una pantalla estrecha).
 */
defineProps<{ tabs: { id: string; label: string; icon: string }[]; modelValue: string }>()
defineEmits<{ 'update:modelValue': [id: string] }>()
</script>

<template>
  <nav class="hidden md:flex md:flex-col md:gap-1 md:w-44 md:shrink-0" aria-label="Secciones de tu perfil">
    <button
      v-for="tab in tabs" :key="tab.id" type="button"
      class="flex items-center gap-2.5 px-3 h-10 rounded-[var(--radius-sm)] text-[0.875rem] font-medium text-left transition-colors duration-150"
      :class="modelValue === tab.id
        ? 'bg-[var(--color-ink-overlay)] text-[var(--color-text)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)]/60'"
      @click="$emit('update:modelValue', tab.id)"
    >
      <Icon :name="tab.icon" class="size-4 shrink-0" :class="modelValue === tab.id && 'text-[var(--color-primary-500)]'" />
      {{ tab.label }}
    </button>
  </nav>

  <div class="md:hidden flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 mb-5 nx-scroll">
    <button
      v-for="tab in tabs" :key="tab.id" type="button"
      class="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[0.8125rem] font-medium border transition-colors duration-150"
      :class="modelValue === tab.id
        ? 'bg-[var(--color-primary-500)]/15 border-[var(--color-primary-500)]/50 text-[var(--color-primary-500)]'
        : 'bg-[var(--color-ink-overlay)] border-[var(--color-hairline)] text-[var(--color-text-muted)]'"
      @click="$emit('update:modelValue', tab.id)"
    >
      <Icon :name="tab.icon" class="size-3.5 shrink-0" />
      {{ tab.label }}
    </button>
  </div>
</template>

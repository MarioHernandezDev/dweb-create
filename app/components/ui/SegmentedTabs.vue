<script setup lang="ts">
defineProps<{ options: { value: string; label: string }[]; modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="inline-flex items-center gap-1 rounded-[var(--radius-xs)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] p-1">
    <button
      v-for="opt in options" :key="opt.value" type="button"
      class="px-3.5 h-8 rounded-[calc(var(--radius-xs)-4px)] text-[0.8125rem] font-medium transition-colors duration-150"
      :class="modelValue === opt.value
        ? 'bg-[var(--color-ink-raised)] text-[var(--color-text)] shadow-sm'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

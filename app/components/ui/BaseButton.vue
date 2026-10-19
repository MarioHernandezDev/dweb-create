<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    to?: string
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    icon?: string
    iconOnly?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'md', disabled: false, type: 'button' }
)

const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'button'))

const sizeClasses: Record<string, string> = {
  sm: 'h-9 px-3.5 text-[0.8125rem] gap-1.5',
  md: 'h-11 px-5 text-[0.9375rem] gap-2',
  lg: 'h-13 px-6 text-base gap-2.5'
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-[var(--color-flame-500)] text-[var(--color-on-flame)] hover:bg-[var(--color-flame-400)] active:bg-[var(--color-flame-600)] shadow-[0_8px_20px_-8px_var(--color-flame-500)]',
  secondary:
    'bg-[var(--color-ink-overlay)] text-[var(--color-text)] border border-[var(--color-hairline-strong)] hover:border-[var(--color-flame-500)]/60',
  ghost: 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)]',
  danger: 'bg-transparent text-[var(--color-status-alert)] border border-[var(--color-status-alert)]/35 hover:bg-[var(--color-status-alert)]/10'
}
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :type="!to ? type : undefined"
    :disabled="!to ? disabled : undefined"
    class="inline-flex items-center justify-center font-medium rounded-[var(--radius-xs)] transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none select-none"
    :class="[sizeClasses[size], variantClasses[variant], iconOnly && 'px-0 aspect-square']"
  >
    <Icon v-if="icon" :name="icon" class="shrink-0" :class="size === 'sm' ? 'size-4' : 'size-[1.15em]'" />
    <span v-if="!iconOnly"><slot /></span>
  </component>
</template>

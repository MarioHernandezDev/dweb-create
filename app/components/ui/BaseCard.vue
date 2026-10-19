<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'raised' | 'overlay'
    radius?: 'sm' | 'md' | 'lg'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    interactive?: boolean
  }>(),
  { tone: 'raised', radius: 'md', padding: 'md', interactive: false }
)

const radiusClasses: Record<string, string> = {
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]'
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7'
}
</script>

<template>
  <div
    class="border border-[var(--color-hairline)]"
    :class="[
      tone === 'raised' ? 'bg-[var(--color-ink-raised)]' : 'bg-[var(--color-ink-overlay)]',
      radiusClasses[radius],
      paddingClasses[padding],
      interactive && 'transition-[border-color,transform,box-shadow] duration-200 ease-[var(--ease-spring)] hover:border-[var(--color-hairline-strong)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] active:scale-[0.99] active:translate-y-0 cursor-pointer'
    ]"
  >
    <slot />
  </div>
</template>

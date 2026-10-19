<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    initials: string
    hue?: number
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { hue: 230, size: 'md' }
)

const sizeClasses: Record<string, string> = {
  sm: 'size-8 text-[0.6875rem]',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg'
}

const bg = computed(() => `color-mix(in oklab, hsl(${props.hue} 70% 55%) 85%, var(--color-ink-raised))`)
</script>

<template>
  <div
    class="flex items-center justify-center rounded-full font-semibold tracking-wide shrink-0 text-white"
    :class="sizeClasses[size]"
    :style="{ background: bg }"
  >
    {{ initials }}
  </div>
</template>

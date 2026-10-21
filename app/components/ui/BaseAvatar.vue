<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    initials: string
    /** Foto de perfil real, si la hay — sin ella (o si falla al cargar) se cae a las iniciales de siempre. */
    src?: string | null
    hue?: number
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { hue: 230, size: 'md', src: null }
)

const sizeClasses: Record<string, string> = {
  sm: 'size-8 text-[0.6875rem]',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg'
}

const bg = computed(() => `color-mix(in oklab, hsl(${props.hue} 70% 55%) 85%, var(--color-ink-raised))`)

// Se reinicia al cambiar `src` para no quedarse "atascado" en el fallback
// si luego se sube una foto válida.
const imgFailed = ref(false)
watch(() => props.src, () => { imgFailed.value = false })
</script>

<template>
  <div
    class="flex items-center justify-center rounded-full font-semibold tracking-wide shrink-0 text-white overflow-hidden"
    :class="sizeClasses[size]"
    :style="!src || imgFailed ? { background: bg } : undefined"
  >
    <img v-if="src && !imgFailed" :src="src" alt="" class="size-full object-cover" @error="imgFailed = true">
    <template v-else>{{ initials }}</template>
  </div>
</template>

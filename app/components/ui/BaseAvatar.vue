<script setup lang="ts">
/** Foto de perfil o iniciales. El matiz de las iniciales llega como variable CSS (--hue). */
const props = withDefaults(
  defineProps<{
    initials: string
    /** Foto de perfil real, si la hay — sin ella (o si falla al cargar) se cae a las iniciales. */
    src?: string | null
    hue?: number
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'fluid'
  }>(),
  { hue: 230, size: 'md', src: null }
)

// Se reinicia al cambiar `src` para no quedarse "atascado" en el fallback
// si luego se sube una foto válida.
const imgFailed = ref(false)
watch(() => props.src, () => { imgFailed.value = false })
const hasPhoto = computed(() => !!props.src && !imgFailed.value)
</script>

<template>
  <div
    class="avatar" :class="[size !== 'md' && `avatar--${size}`, hasPhoto && 'avatar--has-photo']"
    :style="{ '--hue': hue }"
  >
    <img v-if="hasPhoto" :src="src!" alt="" class="avatar__img" @error="imgFailed = true">
    <template v-else>{{ initials }}</template>
  </div>
</template>

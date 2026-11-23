<script setup lang="ts">
/**
 * Etiqueta o filtro. Con `selected` definido (true/false) se pinta como botón
 * seleccionable con aria-pressed; sin él es una etiqueta de solo lectura.
 */
// `selected: undefined` es imprescindible: Vue convierte una prop booleana ausente en `false`, y con eso TODAS las
// etiquetas se pintaban como botones (con foco, clic y aria-pressed) aunque fueran solo texto.
const props = withDefaults(defineProps<{
  selected?: boolean
  icon?: string
  tint?: 'voltio' | 'mantequilla' | 'menta' | 'cielo' | 'rosa'
  outline?: boolean
  size?: 'sm' | 'md'
}>(), { selected: undefined })
defineEmits<{ click: [] }>()
const pressable = computed(() => props.selected !== undefined)
</script>

<template>
  <component
    :is="pressable ? 'button' : 'span'" :type="pressable ? 'button' : undefined"
    class="chip" :class="[tint && `chip--${tint}`, outline && 'chip--outline', size === 'sm' && 'chip--sm']"
    :aria-pressed="pressable ? selected : undefined"
    @click="pressable && $emit('click')"
  >
    <Icon v-if="icon" :name="icon" class="chip__icon" />
    <slot />
  </component>
</template>

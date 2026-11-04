<script setup lang="ts">
/**
 * Botón de solo icono. `label` es obligatorio: es el nombre accesible, ya que
 * el botón no tiene texto visible.
 */
const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    to?: string
    variant?: 'ghost' | 'secondary' | 'outline' | 'primary' | 'inverse'
    size?: 'sm' | 'md'
    disabled?: boolean
  }>(),
  { variant: 'ghost', size: 'md', disabled: false }
)
const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'button'))
</script>

<template>
  <component
    :is="tag" :to="to" :type="!to ? 'button' : undefined" :disabled="!to ? disabled : undefined"
    :aria-label="label" :title="label"
    class="btn btn--icon" :class="[`btn--${variant}`, size === 'sm' && 'btn--sm']"
  >
    <Icon :name="icon" class="btn__icon" />
  </component>
</template>

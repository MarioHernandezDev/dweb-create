<script setup lang="ts">
/**
 * Botón y enlace con aspecto de botón (si recibe `to`). Aspecto en
 * assets/css/components/button.css; aquí solo se eligen clases.
 * `danger` se mantiene como alias de `destructive` mientras se migran pantallas.
 */
const props = withDefaults(
  defineProps<{
    to?: string
    variant?: 'primary' | 'brand' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'danger' | 'inverse' | 'outline-inverse'
    size?: 'sm' | 'md' | 'lg'
    icon?: string
    iconOnly?: boolean
    iconSpin?: boolean
    loading?: boolean
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'md', disabled: false, type: 'button' }
)

const tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'button'))
const variantName = computed(() => (props.variant === 'danger' ? 'destructive' : props.variant))
const blocked = computed(() => props.disabled || props.loading)
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :type="!to ? type : undefined"
    :disabled="!to ? blocked : undefined"
    :aria-disabled="to && blocked ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    class="btn"
    :class="[
      `btn--${variantName}`,
      size !== 'md' && `btn--${size}`,
      iconOnly && 'btn--icon',
      block && 'btn--block'
    ]"
  >
    <Icon
      v-if="loading || icon" :name="loading ? 'ph:circle-notch-bold' : icon!"
      class="btn__icon" :class="(loading || iconSpin) && 'btn__icon--spin'"
    />
    <span v-if="!iconOnly"><slot /></span>
  </component>
</template>

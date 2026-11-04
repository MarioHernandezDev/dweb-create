<script setup lang="ts">
/** Campo de una línea: texto, correo, número, búsqueda, contraseña… Va dentro de un BaseField. */
defineOptions({ inheritAttrs: false })
defineProps<{
  id?: string
  type?: string
  /** Icono delante (p. ej. `ph:magnifying-glass-bold` en un buscador). */
  icon?: string
  /** Texto fijo detrás (unidad: «€», «%»). */
  suffix?: string
  invalid?: boolean
  describedBy?: string
}>()
const model = defineModel<string | number | null>()
</script>

<template>
  <Icon v-if="icon" :name="icon" class="field__icon" />
  <input
    v-bind="$attrs" :id="id" v-model="model" :type="type ?? 'text'"
    class="input" :class="[icon && 'input--icon', suffix && 'input--suffix']"
    :aria-invalid="invalid ? 'true' : undefined" :aria-describedby="describedBy"
  >
  <span v-if="suffix" class="field__suffix" aria-hidden="true">{{ suffix }}</span>
</template>

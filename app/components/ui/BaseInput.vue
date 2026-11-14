<script setup lang="ts">
/** Campo de una línea: texto, correo, número, búsqueda, contraseña… Va dentro de un BaseField. */
defineOptions({ inheritAttrs: false })
const props = defineProps<{
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

// Los campos de contraseña llevan un ojo para ver lo que se escribe (útil en móvil y con doble casilla).
const isPassword = computed(() => props.type === 'password')
const revealed = ref(false)
const inputType = computed(() => (isPassword.value && revealed.value ? 'text' : (props.type ?? 'text')))
</script>

<template>
  <Icon v-if="icon" :name="icon" class="field__icon" />
  <input
    v-bind="$attrs" :id="id" v-model="model" :type="inputType"
    class="input" :class="[icon && 'input--icon', (suffix || isPassword) && 'input--suffix']"
    :aria-invalid="invalid ? 'true' : undefined" :aria-describedby="describedBy"
  >
  <span v-if="suffix" class="field__suffix" aria-hidden="true">{{ suffix }}</span>
  <button
    v-if="isPassword" type="button" class="field__toggle" data-password-toggle
    :aria-label="revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'" :aria-pressed="revealed" @click="revealed = !revealed"
  >
    <Icon :name="revealed ? 'ph:eye-slash-bold' : 'ph:eye-bold'" class="size-5" />
  </button>
</template>

<script setup lang="ts">
/**
 * Envuelve cualquier control de formulario: etiqueta, ayuda, error y éxito con
 * la misma jerarquía siempre. Entrega al control lo que necesita para ser
 * accesible (id, aria-describedby, aria-invalid):
 *
 *   <BaseField label="Correo" :error="error" v-slot="f">
 *     <BaseInput v-bind="f" v-model="email" type="email" />
 *   </BaseField>
 */
const props = defineProps<{
  label: string
  hint?: string
  error?: string | null
  success?: string
  optional?: boolean
  /** Contador «n/max»; solo se muestra si hay `max`. */
  count?: number
  max?: number
}>()

const id = useId()
const describedBy = computed(() => {
  const ids: string[] = []
  if (props.error) ids.push(`${id}-error`)
  else if (props.success) ids.push(`${id}-success`)
  if (props.hint) ids.push(`${id}-hint`)
  return ids.join(' ') || undefined
})
</script>

<template>
  <div class="field" :class="success && !error && 'field--success'">
    <label class="field__label" :for="id">
      {{ label }}<span v-if="optional" class="field__optional">(opcional)</span>
    </label>
    <div class="field__control">
      <slot :id="id" :described-by="describedBy" :invalid="!!error" />
    </div>
    <p v-if="error" :id="`${id}-error`" class="field__error" role="alert">
      <Icon name="ph:warning-circle-bold" class="size-4 shrink-0 mt-0.5" />{{ error }}
    </p>
    <p v-else-if="success" :id="`${id}-success`" class="field__success">
      <Icon name="ph:check-circle-bold" class="size-4 shrink-0 mt-0.5" />{{ success }}
    </p>
    <p v-if="hint" :id="`${id}-hint`" class="field__hint">{{ hint }}</p>
    <p v-if="max && count !== undefined" class="field__counter" aria-hidden="true">{{ count }}/{{ max }}</p>
  </div>
</template>

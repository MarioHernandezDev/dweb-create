<script setup lang="ts">
/** Campo de varias líneas: 120 px mínimo, solo redimensionable en vertical. `autosize` crece con el texto. */
defineOptions({ inheritAttrs: false })
defineProps<{ id?: string; invalid?: boolean; describedBy?: string; autosize?: boolean }>()
const model = defineModel<string | null>()
</script>

<template>
  <textarea
    v-bind="$attrs" :id="id" v-model="model"
    class="textarea" :class="autosize && 'textarea--autosize'"
    :aria-invalid="invalid ? 'true' : undefined" :aria-describedby="describedBy"
  />
</template>

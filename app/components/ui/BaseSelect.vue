<script setup lang="ts">
/** Selector nativo con el aspecto del sistema (flecha propia, 48 px). Las opciones van en el slot. */
defineOptions({ inheritAttrs: false })
defineProps<{ id?: string; invalid?: boolean; describedBy?: string }>()
const model = defineModel<string | number | null>()
</script>

<template>
  <select
    v-bind="$attrs" :id="id" v-model="model" class="select"
    :aria-invalid="invalid ? 'true' : undefined" :aria-describedby="describedBy"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number
  readonly?: boolean
  size?: 'sm' | 'md'
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const hovered = ref<number | null>(null)
const displayed = computed(() => hovered.value ?? props.modelValue)

function pick(n: number) {
  if (props.readonly) return
  emit('update:modelValue', n)
}
</script>

<template>
  <div
    class="flex items-center gap-0.5" :class="readonly ? '' : 'cursor-pointer'"
    role="radiogroup" aria-label="Valoración de 1 a 5 estrellas"
  >
    <button
      v-for="n in 5" :key="n" type="button" :disabled="readonly"
      class="disabled:cursor-default"
      :aria-label="`${n} estrella${n === 1 ? '' : 's'}`" :aria-pressed="modelValue >= n"
      @click="pick(n)"
      @mouseenter="!readonly && (hovered = n)" @mouseleave="!readonly && (hovered = null)"
    >
      <Icon
        :name="displayed >= n ? 'ph:star-fill' : 'ph:star'"
        :class="[
          size === 'sm' ? 'size-4' : 'size-5',
          displayed >= n ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-faint)]'
        ]"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ChatPrivacy } from '~/types'

/** Quién puede escribirte por el chat: opciones excluyentes (radiogroup). Igual para los dos roles. */
defineProps<{
  options: { value: ChatPrivacy; label: string; description: string }[]
  modelValue: ChatPrivacy | null | undefined
  error?: string
}>()
defineEmits<{ select: [value: ChatPrivacy] }>()
</script>

<template>
  <div>
    <div role="radiogroup" aria-label="Quién puede escribirte" class="choice-list">
      <button
        v-for="opt in options" :key="opt.value" type="button" role="radio" class="choice"
        :aria-checked="modelValue === opt.value" @click="$emit('select', opt.value)"
      >
        <span class="choice__dot" aria-hidden="true" />
        <span>
          <span class="choice__label">{{ opt.label }}</span>
          <span class="choice__desc">{{ opt.description }}</span>
        </span>
      </button>
    </div>
    <p v-if="error" class="setting-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
/** Título, texto y hashtags de una publicación, con sus avisos, contador del límite de la red y «copiar». Los datos viven en `usePostEditorPanel`. */
defineProps<{
  titleError: string | null
  captionError: string | null
  captionLength: number
  captionMax?: number
  parsedHashtags: string[]
  copied: boolean
  canCopy: boolean
  rows?: number
}>()
const emit = defineEmits<{ copy: [] }>()
const title = defineModel<string>('title', { required: true })
const caption = defineModel<string>('caption', { required: true })
const hashtags = defineModel<string>('hashtags', { required: true })
</script>

<template>
  <div class="pdetail__fields">
    <BaseField v-slot="f" label="Título" :error="titleError" hint="Solo lo ves tú (y la marca, si es una colaboración).">
      <BaseInput v-bind="f" v-model="title" maxlength="120" />
    </BaseField>
    <BaseField v-slot="f" label="Texto de la publicación" :error="captionError" :count="captionLength" :max="captionMax">
      <BaseTextarea v-bind="f" v-model="caption" :rows="rows ?? 6" autosize placeholder="Escribe aquí el texto que acompañará a la publicación…" />
    </BaseField>
    <BaseField v-slot="f" label="Hashtags" optional hint="Sepáralos con espacios o comas. La almohadilla se pone sola.">
      <BaseInput v-bind="f" v-model="hashtags" placeholder="#moda #verano" autocapitalize="off" spellcheck="false" />
    </BaseField>
    <div v-if="parsedHashtags.length" class="pdetail__tags">
      <Chip v-for="tag in parsedHashtags" :key="tag" size="sm">{{ tag }}</Chip>
    </div>
    <div>
      <BaseButton variant="secondary" size="sm" :icon="copied ? 'ph:check-bold' : 'ph:copy'" :disabled="!canCopy" @click="emit('copy')">
        {{ copied ? 'Copiado' : 'Copiar texto y hashtags' }}
      </BaseButton>
    </div>
  </div>
</template>

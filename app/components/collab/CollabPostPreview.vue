<script setup lang="ts">
/**
 * Publicación de una colaboración desplegada en la pestaña Calendario: portada,
 * título, fase, texto y checklist (solo lectura). Las acciones (editar, aprobar)
 * llegan por el slot por defecto, porque cambian según el rol.
 */
defineProps<{
  post: { id: string; title: string; status: import('~/types').PostStatus; caption?: string | null; mediaUrl?: string | null }
  checklist: { id: string; text: string; done: boolean }[]
}>()
</script>

<template>
  <BaseCard padding="md" class="post-preview">
    <div class="post-preview__head">
      <div class="post-preview__cover">
        <CoverArt :seed="post.id" />
        <SmartImage v-if="post.mediaUrl" :src="post.mediaUrl" :width="160" :height="160" class="post-preview__photo" />
      </div>
      <div class="post-preview__who">
        <p class="post-preview__title">{{ post.title }}</p>
        <PhaseChip :status="post.status" compact />
      </div>
    </div>
    <p v-if="post.caption" class="post-preview__caption">{{ post.caption }}</p>
    <ul v-if="checklist.length" class="checklist">
      <li v-for="item in checklist" :key="item.id" class="checklist__item" :class="item.done && 'is-done'">
        <Icon :name="item.done ? 'ph:check-square-fill' : 'ph:square-bold'" class="size-4" />
        <span>{{ item.text }}</span>
      </li>
    </ul>
    <slot />
  </BaseCard>
</template>

<script setup lang="ts">
/** Lo que falta para completar la ficha; cada elemento lleva a la pestaña donde se arregla. */
defineProps<{ items: { label: string; tab?: string }[]; doneText: string }>()
defineEmits<{ select: [tab: string] }>()
</script>

<template>
  <ul v-if="items.length" class="todo-list">
    <li v-for="p in items" :key="p.label">
      <button type="button" class="todo-item w-full" data-pending-item @click="$emit('select', p.tab ?? 'ficha')">
        {{ p.label }} <Icon name="ph:caret-right-bold" class="size-4" />
      </button>
    </li>
  </ul>
  <p v-else class="state-ok" data-pending-none><Icon name="ph:check-circle-fill" class="size-4" /> {{ doneText }}</p>
</template>

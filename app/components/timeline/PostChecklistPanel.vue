<script setup lang="ts">
import type { ChecklistItem } from '~/composables/useChecklist'

/** Pasos pendientes de una publicación: barra de avance, lista y alta de uno nuevo. */
defineProps<{ items: ChecklistItem[]; pct: number }>()
const emit = defineEmits<{ toggle: [id: string, done: boolean]; remove: [id: string]; add: [] }>()
const newText = defineModel<string>('newText', { required: true })
</script>

<template>
  <div>
    <template v-if="items.length">
      <div class="pcheck__bar" :style="{ '--progress': `${pct}%` }"><span /></div>
      <ul class="pcheck__list">
        <li v-for="item in items" :key="item.id" class="pcheck__item">
          <button
            type="button" class="pcheck__box" :aria-pressed="item.done"
            :aria-label="item.done ? `Marcar «${item.text}» como pendiente` : `Marcar «${item.text}» como hecha`"
            @click="emit('toggle', item.id, !item.done)"
          >
            <Icon v-if="item.done" name="ph:check-bold" class="size-3.5" />
          </button>
          <span class="pcheck__text" :class="item.done && 'is-done'">{{ item.text }}</span>
          <button type="button" class="pcheck__del" :aria-label="`Borrar «${item.text}»`" @click="emit('remove', item.id)">
            <Icon name="ph:x-bold" class="size-3.5" />
          </button>
        </li>
      </ul>
    </template>
    <p v-else class="pdetail__empty">Apunta los pasos que no quieres olvidar: grabar, editar, subtítulos…</p>
    <form class="pdetail__add" @submit.prevent="emit('add')">
      <input v-model="newText" type="text" class="input" placeholder="Añadir un paso…" aria-label="Nuevo paso del checklist">
      <BaseButton type="submit" size="sm" variant="secondary" :disabled="!newText.trim()">Añadir</BaseButton>
    </form>
  </div>
</template>

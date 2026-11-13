<script setup lang="ts">
import { relativeTime } from '~/utils/status'

/** Lo que ha dicho la marca sobre la pieza: aprobaciones y cambios pedidos. */
defineProps<{ notes: { id: string; kind: string; authorName: string; comment?: string | null; createdAt: string }[] }>()
</script>

<template>
  <ol class="phistory">
    <li v-for="note in notes" :key="note.id" class="phistory__item">
      <span class="phistory__icon" :data-kind="note.kind === 'approved' ? 'approved' : 'changes'">
        <Icon :name="note.kind === 'approved' ? 'ph:check-bold' : 'ph:arrow-counter-clockwise-bold'" class="size-4" />
      </span>
      <div class="min-w-0 flex-1">
        <p>
          <strong>{{ note.authorName }}</strong>
          {{ note.kind === 'approved' ? 'aprobó esta publicación' : 'pidió cambios' }}
          <span class="phistory__when">· {{ relativeTime(note.createdAt) }}</span>
        </p>
        <p v-if="note.comment" class="phistory__comment">{{ note.comment }}</p>
      </div>
    </li>
  </ol>
</template>

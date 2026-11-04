<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { CollaborationStatus } from '~/types'

/**
 * Colaboración en una lista (los dos roles): la otra parte, el precio, el brief
 * y el estado. Una sola tarjeta clicable (un botón, sin controles dentro).
 * `hint` dice a quién le toca mover ficha cuando la solicitud está pendiente.
 * Aspecto en assets/css/patterns/collab.css.
 */
defineProps<{
  name: string
  status: CollaborationStatus
  brief: string
  budgetCents: number | null
  createdAt: string
  hint?: string
}>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button type="button" class="collab-card" @click="$emit('open')">
    <span class="collab-card__head">
      <BaseAvatar :initials="initialsFromName(name)" :hue="hueFromString(name)" />
      <span class="collab-card__who">
        <span class="collab-card__name">{{ name }}</span>
        <span class="collab-card__date">{{ relativeTime(createdAt) }}</span>
      </span>
      <span class="collab-card__price">{{ budgetCents ? formatEuros(budgetCents) : 'Sin precio' }}</span>
    </span>
    <span class="collab-card__brief">{{ brief }}</span>
    <span class="collab-card__foot">
      <CollabStatus :status="status" />
      <span v-if="hint" class="collab-card__hint">{{ hint }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { CollaborationStatus } from '~/types'
import { expiryState } from '~/utils/collab-expiry'

/**
 * Colaboración en una lista (los dos roles): la otra parte, el precio, el brief
 * y el estado. Una sola tarjeta clicable (un botón, sin controles dentro).
 * `hint` dice a quién le toca mover ficha cuando la solicitud está pendiente.
 * Aspecto en assets/css/patterns/collab.css.
 */
const props = defineProps<{
  name: string
  status: CollaborationStatus
  brief: string
  budgetCents: number | null
  createdAt: string
  /** Caducidad de la solicitud pendiente. */
  expiresAt?: string | null
  hint?: string
  /** «action»: me toca a mí (se marca con la firma); «waiting»: espera a la otra parte. */
  hintTone?: 'action' | 'waiting'
  /** Entregables resueltos / exigibles (solo si la colaboración los tiene). */
  progress?: { done: number; total: number } | null
}>()
defineEmits<{ open: [] }>()
const expiry = computed(() => expiryState(props.status, props.expiresAt))
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
    <span v-if="progress" class="collab-card__progress" :aria-label="`${progress.done} de ${progress.total} entregables resueltos`">
      <span class="collab-card__bar"><span class="collab-card__bar-fill" :style="{ width: `${(progress.done / progress.total) * 100}%` }" /></span>
      <span class="collab-card__count">{{ progress.done }} de {{ progress.total }} entregables</span>
    </span>
    <span class="collab-card__foot">
      <span v-if="hint && hintTone" class="collab-card__turn" :data-tone="hintTone">{{ hintTone === 'action' ? 'Te toca' : 'En espera' }}</span>
      <!-- Una solicitud pendiente ya se explica con «Te toca / En espera» + la frase: repetir «Pendiente de respuesta» era ruido. -->
      <CollabStatus v-if="!(hintTone && status === 'requested')" :status="status" />
      <span v-if="expiry.label" class="collab-card__expiry" :data-expired="expiry.expired">{{ expiry.label }}</span>
      <span v-if="hint" class="collab-card__hint" :data-tone="hintTone">{{ hint }}</span>
      <span v-if="hintTone === 'action'" class="collab-card__go" aria-hidden="true">Abrir <Icon name="ph:arrow-right-bold" class="size-4" /></span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { CollaborationStatus } from '~/types'

/** Cabecera del detalle de una colaboración: la otra parte, su estado y el acceso al chat (slot). */
defineProps<{ name: string; status: CollaborationStatus; brief: string }>()
</script>

<template>
  <div class="collab-party">
    <div class="collab-party__row">
      <BaseAvatar :initials="initialsFromName(name)" :hue="hueFromString(name)" size="lg" />
      <div class="collab-party__who">
        <p class="collab-party__name">{{ name }}</p>
        <CollabStatus :status="status" />
      </div>
      <slot />
    </div>
    <p class="collab-party__brief">{{ brief }}</p>
  </div>
</template>

<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { CollaborationStatus } from '~/types'

/**
 * Cabecera de la página de una colaboración: migas de pan («Colaboraciones / Marca»), la otra parte, el título,
 * su estado y las acciones (slot). El título es el del paquete aceptado o la primera frase del brief.
 */
defineProps<{
  role: 'creator' | 'partner'
  counterpart: string
  title: string
  status: CollaborationStatus
  /** Texto bajo el título (p. ej. «Entrega final 14 nov»). */
  meta?: string
  /** Etiqueta de la fase actual; sustituye al estado cuando existe. */
  phaseLabel?: string | null
}>()
</script>

<template>
  <header class="chead">
    <nav class="chead__crumbs" aria-label="Migas de pan">
      <NuxtLink :to="`/${role}/requests`">Colaboraciones</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ counterpart }}</span>
    </nav>
    <div class="chead__row">
      <BaseAvatar :initials="initialsFromName(counterpart)" :hue="hueFromString(counterpart)" size="lg" />
      <div class="chead__who">
        <h1 class="chead__title">{{ title }} <CollabStatus v-if="!phaseLabel" :status="status" /><span v-else class="hub__chip">{{ phaseLabel }}</span></h1>
        <p class="chead__meta">{{ counterpart }}<template v-if="meta"> · {{ meta }}</template></p>
      </div>
      <div class="chead__actions"><slot /></div>
    </div>
  </header>
</template>

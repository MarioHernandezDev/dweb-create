<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { CollaborationStatus } from '~/types'

/**
 * Cabecera de la página de una colaboración: migas de pan («Colaboraciones / Marca»), la otra parte, el nombre,
 * el estado y las acciones (slot). El nombre sale de `collabDisplayName` (paquete aceptado, primera frase corta del
 * brief o «Colaboración con …»); el brief completo se resume debajo para que el título no dependa de un texto cortado.
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
  /** Resumen del brief (dos líneas como máximo), si el título no es ya ese texto. */
  brief?: string | null
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
        <h1 class="chead__title">{{ title }}</h1>
        <p class="chead__meta">
          <CollabStatus v-if="!phaseLabel" :status="status" /><span v-else class="hub__chip">{{ phaseLabel }}</span>
          <span>con {{ counterpart }}</span>
          <span v-if="meta">{{ meta }}</span>
        </p>
        <p v-if="brief" class="chead__brief">{{ brief }}</p>
      </div>
      <div class="chead__actions"><slot /></div>
    </div>
  </header>
</template>

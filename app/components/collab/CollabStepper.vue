<script setup lang="ts">
import { visiblePhases, type CollabPhase } from '~/utils/collab-phase'

/** Recorrido de la colaboración paso a paso: lo hecho, el paso actual y lo que falta. La fase se deduce de los datos. */
const props = defineProps<{ phase: CollabPhase; payLabel: string }>()
const { paymentsEnabled } = useLaunchMode()
// Una colaboración ya pagada enseña siempre su último paso, aunque los cobros estén apagados ahora.
const phases = computed(() => visiblePhases(paymentsEnabled || props.phase === 'paid'))
const idx = computed(() => phases.value.findIndex((p) => p.value === props.phase))
const label = (v: CollabPhase, l: string) => (v === 'paid' ? props.payLabel : l)
</script>

<template>
  <ol class="cstep" aria-label="Progreso de la colaboración">
    <li v-for="(p, i) in phases" :key="p.value" class="cstep__item" :data-state="i < idx || (i === idx && p.value === 'paid') ? 'done' : i === idx ? 'current' : 'todo'" :aria-current="i === idx ? 'step' : undefined">
      <span class="cstep__bar" />
      <span class="cstep__label">
        <Icon :name="i < idx || (i === idx && p.value === 'paid') ? 'ph:check-circle-fill' : i === idx ? 'ph:circle-half-fill' : 'ph:circle'" class="size-5" />
        {{ label(p.value, p.label) }}
      </span>
    </li>
  </ol>
</template>

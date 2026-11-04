<script setup lang="ts">
import type { PostStatus } from '~/types'

interface Stage { status: PostStatus; copy: string }

const stages: Stage[] = [
  { status: 'idea', copy: 'Apuntas la idea en el calendario de la semana.' },
  { status: 'in_production', copy: 'Se graba o se diseña; quien lo está haciendo marca el estado.' },
  { status: 'ready_for_review', copy: 'La marca lo revisa antes de que salga.' },
  { status: 'scheduled', copy: 'Fecha y hora fijadas, listo para publicarse.' },
  { status: 'published', copy: 'Publicado. Las métricas empiezan a entrar.' }
]
</script>

<template>
  <section id="fases" class="band band--paper">
    <div class="container">
      <div class="band__head reveal">
        <h2 class="band__title">Las cinco fases por las que pasa cada entrega.</h2>
        <p class="band__intro">Creador y marca ven el mismo tablero, así que nadie pregunta en qué punto está cada cosa.</p>
      </div>

      <ol class="phases">
        <li v-for="(stage, i) in stages" :key="stage.status" class="card phase reveal">
          <span class="phase__num" aria-hidden="true">{{ i + 1 }}</span>
          <PhaseChip :status="stage.status" class="self-start" />
          <p class="phase__copy">{{ stage.copy }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

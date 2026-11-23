<script setup lang="ts">
import type { Role } from '~/types'
import { roleMeta } from '~/utils/nav'

interface RoleCard { role: Role; points: string[] }

const cards: RoleCard[] = [
  {
    role: 'creator',
    points: [
      'Tu semana, con lo que toca grabar y cuándo.',
      'Todas tus colaboraciones y tus entregas en un solo sitio.',
      'Resultados de tus colaboraciones: plazos, respuestas y valoraciones.'
    ]
  },
  {
    role: 'partner',
    points: [
      'Apruebas cada entrega antes de que se publique.',
      'Sigues cada campaña: plazos, respuestas y estado de cada entrega.',
      'Hablas directamente con el creador.'
    ]
  }
]
</script>

<template>
  <section id="perfiles" class="band band--paper" data-companion-hide>
    <div class="container">
      <div class="band__head reveal">
        <h2 class="band__title">Creadores y marcas: mismo tablero, distinta vista.</h2>
      </div>

      <div class="roles">
        <BaseCard
          v-for="card in cards" :key="card.role" radius="lg" padding="lg" class="role reveal"
          :variant="card.role === 'creator' ? 'featured' : 'info'" :tint="card.role === 'partner' ? 'cielo' : undefined"
          :class="card.role === 'creator' && 'role--ink'"
        >
          <WaveMotif v-if="card.role === 'creator'" class="role__waves" />
          <h3 class="role__title">{{ roleMeta[card.role].label }}</h3>
          <p class="role__desc">{{ roleMeta[card.role].description }}</p>
          <ul class="role__points">
            <li v-for="point in card.points" :key="point" class="role__point">
              <Icon name="ph:check-circle-fill" class="role__check" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </BaseCard>
      </div>
    </div>
  </section>
</template>

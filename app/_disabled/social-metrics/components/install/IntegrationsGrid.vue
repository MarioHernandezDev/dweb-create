<script setup lang="ts">
import { platformMeta } from '~/utils/mock-data'

type PlatformKey = keyof typeof platformMeta

// Estado real de cada red hoy (no una promesa): YouTube se conecta con OAuth;
// Instagram está pendiente de la verificación de Meta; el resto, sin conexión.
function stateOf(platform: PlatformKey): { label: string; tint?: 'menta' | 'mantequilla' } {
  if (platform === 'youtube') return { label: 'Disponible', tint: 'menta' }
  if (platform === 'instagram') return { label: 'En verificación con Meta', tint: 'mantequilla' }
  return { label: 'Próximamente' }
}
const platforms = Object.keys(platformMeta) as PlatformKey[]
</script>

<template>
  <section id="redes" class="band band--sunken">
    <div class="container">
      <div class="band__head reveal">
        <h2 class="band__title">Conecta tus redes y mide en un solo sitio.</h2>
        <p class="band__intro">Estas son las redes que CIBERAN conecta hoy y las que están en camino. Las métricas solo se muestran de cuentas conectadas y verificadas.</p>
      </div>

      <ul class="integrations">
        <li v-for="platform in platforms" :key="platform" class="card integration reveal">
          <span class="platform-icon" :data-platform="platform">
            <Icon :name="platformMeta[platform].icon" class="size-5" />
          </span>
          <div>
            <p class="font-semibold">{{ platformMeta[platform].label }}</p>
            <Chip :tint="stateOf(platform).tint" :outline="!stateOf(platform).tint" size="sm" class="mt-1.5">{{ stateOf(platform).label }}</Chip>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Role } from '~/types'
import { roleMeta } from '~/utils/nav'
import { useScrollReveal } from '~/composables/useScrollReveal'

interface RoleCard { role: Role; accent: string; points: string[] }

const cards: RoleCard[] = [
  {
    role: 'creator',
    accent: 'var(--color-logo-amber)',
    points: [
      'Tu semana, con lo que toca grabar y cuándo.',
      'Conecta tus redes y las métricas llegan solas.',
      'Predicciones de qué formato va a funcionar mejor.'
    ]
  },
  {
    role: 'partner',
    accent: 'var(--color-logo-teal)',
    points: [
      'Apruebas cada entrega antes de que se publique.',
      'Ves las métricas reales de tu campaña.',
      'Hablas directo con el creador de contenido.'
    ]
  }
]

const root = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!root.value) return
  const { reveal } = useScrollReveal()
  reveal(root.value.querySelectorAll('[data-card]'), { stagger: 0.1 })
})
</script>

<template>
  <section id="equipo" ref="root" class="bg-[var(--color-ink-overlay)] px-5 md:px-10 lg:px-16 py-20 md:py-28">
    <div class="max-w-6xl mx-auto">
      <p class="text-[0.8125rem] font-medium text-[var(--color-primary-500)] mb-2">Para quién es</p>
      <h3 class="font-display font-light text-[clamp(1.5rem,3.2vw,2.25rem)] text-[var(--color-text)] max-w-[34ch] mb-12 md:mb-16">
        Partners y creadores de contenido — mismo parte, distinta vista.
      </h3>

      <div class="grid md:grid-cols-2 gap-5 md:gap-6">
        <div
          v-for="card in cards" :key="card.role" data-card
          class="bg-[var(--color-ink-raised)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] p-7 flex flex-col"
        >
          <div class="h-1 w-10 rounded-full mb-6" :style="{ background: card.accent }" />
          <span
            class="flex items-center justify-center size-11 rounded-full mb-5"
            :style="{ background: `color-mix(in oklab, ${card.accent} 16%, transparent)`, color: card.accent }"
          >
            <Icon :name="roleMeta[card.role].icon" class="size-5" />
          </span>
          <p class="font-display text-[1.25rem] text-[var(--color-text)] mb-2">{{ roleMeta[card.role].label }}</p>
          <p class="text-[0.875rem] text-[var(--color-text-muted)] leading-relaxed mb-6">{{ roleMeta[card.role].description }}</p>

          <ul class="flex flex-col gap-2.5 mt-auto">
            <li v-for="point in card.points" :key="point" class="flex items-start gap-2.5 text-[0.8125rem] text-[var(--color-text)]">
              <Icon name="ph:check-bold" class="size-3.5 mt-[0.2em] shrink-0" :style="{ color: card.accent }" />
              <span class="leading-relaxed">{{ point }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

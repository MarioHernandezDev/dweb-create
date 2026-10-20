<script setup lang="ts">
import type { PostStatus } from '~/types'
import { statusMeta } from '~/utils/status'
import { useGsap, prefersReducedMotion } from '~/composables/useGsap'
import { useScrollReveal } from '~/composables/useScrollReveal'

interface Stage { status: PostStatus; copy: string }

const stages: Stage[] = [
  { status: 'idea', copy: 'Apuntas la idea en el calendario de la semana.' },
  { status: 'in_production', copy: 'Se graba o se diseña — el estado lo marca quien lo está haciendo.' },
  { status: 'ready_for_review', copy: 'El manager o la marca lo revisa antes de que salga.' },
  { status: 'scheduled', copy: 'Fecha y hora fijadas, listo para publicarse solo.' },
  { status: 'published', copy: 'Publicado. Las métricas empiezan a entrar solas.' }
]

const root = ref<HTMLElement | null>(null)
const lineH = ref<HTMLElement | null>(null)
const lineV = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!root.value) return
  const { reveal } = useScrollReveal()
  reveal(root.value.querySelectorAll('[data-stage]'), { stagger: 0.1 })

  if (prefersReducedMotion()) {
    if (lineH.value) lineH.value.style.transform = 'scaleX(1)'
    if (lineV.value) lineV.value.style.transform = 'scaleY(1)'
    return
  }

  const { gsap, ScrollTrigger } = useGsap()
  const scrollOpts = { trigger: root.value, start: 'top 65%', end: 'bottom 75%', scrub: 0.6 }
  if (lineH.value) gsap.fromTo(lineH.value, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: scrollOpts })
  if (lineV.value) gsap.fromTo(lineV.value, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { ...scrollOpts, trigger: root.value } })
})
</script>

<template>
  <section ref="root" class="bg-[var(--color-ink)] px-5 md:px-10 lg:px-16 py-20 md:py-28">
    <div class="max-w-6xl mx-auto">
    
      <h3 class="font-display font-light text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.15] text-black max-w-[32ch] mb-14 md:mb-20">
        Las cinco fases por las que pasa cada entrega.
      </h3>

      <!-- Desktop: fila horizontal con línea que se rellena al hacer scroll -->
      <div class="hidden md:grid grid-cols-5 gap-6 relative">
        <div class="absolute left-0 right-0 top-6 h-px bg-[var(--color-hairline-strong)]" aria-hidden="true">
          <div ref="lineH" class="h-full origin-left bg-[var(--color-primary-500)]" style="transform: scaleX(0)" />
        </div>
        <div v-for="stage in stages" :key="stage.status" data-stage class="relative flex flex-col items-start">
          <span
            class="relative z-10 flex items-center justify-center size-12 rounded-full mb-5"
            :style="{ background: 'var(--color-ink)', border: `2px solid ${statusMeta[stage.status].color}`, color: statusMeta[stage.status].color }"
          >
            <StatusGlyph :status="stage.status" class="size-5" />
          </span>
          <p class="font-display text-[1.0625rem] text-[var(--color-text)] mb-1.5">{{ statusMeta[stage.status].label }}</p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed">{{ stage.copy }}</p>
        </div>
      </div>

      <!-- Móvil: lista vertical con línea a la izquierda -->
      <div class="md:hidden relative pl-14">
        <div class="absolute left-6 top-1 bottom-1 w-px bg-[var(--color-hairline-strong)]" aria-hidden="true">
          <div ref="lineV" class="w-full origin-top bg-[var(--color-primary-500)]" style="height: 100%; transform: scaleY(0)" />
        </div>
        <div v-for="(stage, i) in stages" :key="stage.status" data-stage class="relative" :class="i < stages.length - 1 ? 'pb-9' : ''">
          <span
            class="absolute -left-14 flex items-center justify-center size-10 rounded-full"
            :style="{ background: 'var(--color-ink)', border: `2px solid ${statusMeta[stage.status].color}`, color: statusMeta[stage.status].color }"
          >
            <StatusGlyph :status="stage.status" class="size-4" />
          </span>
          <p class="font-display text-[1rem] text-[var(--color-text)] mb-1 pt-1.5">{{ statusMeta[stage.status].label }}</p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed max-w-[38ch]">{{ stage.copy }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

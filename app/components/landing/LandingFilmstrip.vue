<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { coverPhotos, localPhotos, type CoverPhoto } from '~/utils/images'
import { useGsap, prefersReducedMotion } from '~/composables/useGsap'
import { useScrollReveal } from '~/composables/useScrollReveal'

interface Frame { photo: CoverPhoto; caption: string }

const frames: Frame[] = [
  { photo: coverPhotos.creator, caption: 'Graba o diseña — el creador marca el ritmo de la semana.' },
  { photo: localPhotos.onboarding, caption: 'El partner revisa y aprueba antes de que salga nada.' },
  { photo: localPhotos.metrics, caption: 'Las métricas y la predicción de éxito llegan solas.' },
  { photo: coverPhotos.partner, caption: 'Y el partner ve crecer el resultado real, no una maqueta.' }
]

const section = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const heading = ref<HTMLElement | null>(null)

let mm: ReturnType<ReturnType<typeof useGsap>['gsap']['matchMedia']> | undefined

onMounted(async () => {
  if (heading.value) {
    const { reveal } = useScrollReveal()
    reveal(heading.value.querySelectorAll('[data-reveal]'))
  }

  if (prefersReducedMotion() || !section.value || !viewport.value || !track.value) return

  await nextTick()
  const { gsap, ScrollTrigger } = useGsap()

  mm = gsap.matchMedia()
  mm.add('(min-width: 768px)', () => {
    const distance = () => Math.max(0, track.value!.scrollWidth - viewport.value!.clientWidth)
    const tween = gsap.to(track.value, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section.value,
        start: 'top top',
        end: () => '+=' + distance(),
        scrub: 0.8,
        pin: true,
        invalidateOnRefresh: true
      }
    })
    return () => tween.scrollTrigger?.kill()
  })

  useEventListener(window, 'resize', () => ScrollTrigger.refresh())
})

onUnmounted(() => mm?.revert())
</script>

<template>
  <section ref="section" class="relative isolate overflow-hidden bg-[var(--color-primary-900)]">
    <svg aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1200 900" preserveAspectRatio="none">
      <defs>
        <symbol id="nx-ant-filmstrip" viewBox="0 0 20 12">
          <g fill="none" stroke="var(--color-logo-amber)" stroke-width="1" stroke-linecap="round">
            <path d="M9 7 L6 10.5 M9 7 L7 3 M12 7 L13 10.5 M12 7 L13 3" />
            <path d="M15.5 4.8 L18.5 3 M15.5 5.6 L18.8 6.2" />
          </g>
          <ellipse cx="5" cy="6" rx="3.6" ry="3" fill="var(--color-logo-amber)" />
          <ellipse cx="10.3" cy="6" rx="2.3" ry="2.1" fill="var(--color-logo-amber)" />
          <ellipse cx="14.6" cy="6" rx="1.9" ry="1.9" fill="var(--color-logo-amber)" />
        </symbol>
      </defs>

      <path
        d="M -40 150 C 140 110, 260 190, 440 155 S 760 100, 900 150 S 1100 190, 1240 140"
        fill="none" stroke="rgb(255 255 255 / 16%)" stroke-width="2.5" stroke-linecap="round"
        stroke-dasharray="1 13"
      />

      <use href="#nx-ant-filmstrip" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: 0s" />
      <use href="#nx-ant-filmstrip" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: -9s" />
      <use href="#nx-ant-filmstrip" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: -18s" />
    </svg>

    <div class="min-h-dvh flex flex-col justify-center py-16 md:py-0">
      <div ref="heading" class="px-5 md:px-10 lg:px-16 max-w-7xl mx-auto w-full mb-8 md:mb-10 overflow-hidden">
        <p data-reveal class="text-[0.8125rem] font-medium text-[var(--color-logo-teal)] mb-2">Una entrega, cuatro miradas</p>
        <h3 class="font-display font-light text-[clamp(1.5rem,3.6vw,2.5rem)] text-white max-w-[30ch]">
          <span data-reveal class="block">Lo mismo se ve distinto según quién lo mira — FEEDMA lo enseña todo a la vez.</span>
        </h3>
      </div>

      <div aria-hidden="true" class="h-2.5 w-full nx-sprocket mb-5 md:mb-7" />

      <div ref="viewport" class="overflow-x-auto md:overflow-hidden snap-x snap-mandatory md:snap-none nx-scroll">
        <div ref="track" class="flex gap-5 md:gap-7 px-5 md:px-10 lg:px-16 w-max will-change-transform">
          <div
            v-for="(frame, i) in frames" :key="frame.caption"
            class="relative shrink-0 w-[88vw] max-w-xl h-[50vh] md:h-[56vh] rounded-[var(--radius-lg)] overflow-hidden snap-center"
          >
            <CoverImage :photo="frame.photo" :width="640" :height="860" scrim="full" class="absolute inset-0 size-full" />
            <div class="absolute inset-x-0 bottom-0 p-5 md:p-6">
              <span class="inline-block font-display text-[0.6875rem] tracking-[0.03em] text-white/50 mb-2">
                TOMA {{ String(i + 1).padStart(2, '0') }}/{{ String(frames.length).padStart(2, '0') }}
              </span>
              <p class="text-white text-[0.9375rem] leading-snug max-w-[26ch]">{{ frame.caption }}</p>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" class="h-2.5 w-full nx-sprocket mt-5 md:mt-7" />
    </div>
  </section>
</template>

<style scoped>
.nx-sprocket {
  background-image: repeating-linear-gradient(90deg, rgb(255 255 255 / 16%) 0 10px, transparent 10px 24px);
}

.nx-ant {
  offset-path: path('M -40 150 C 140 110, 260 190, 440 155 S 760 100, 900 150 S 1100 190, 1240 140');
  offset-rotate: auto;
  animation: nx-ant-walk 20s linear infinite;
}

@keyframes nx-ant-walk {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .nx-ant {
    animation: none;
    offset-distance: 0%;
  }
}
</style>

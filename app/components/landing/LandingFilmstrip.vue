<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { coverPhotos, localPhotos, type CoverPhoto } from '~/utils/images'
import { useGsap, prefersReducedMotion } from '~/composables/useGsap'
import { useScrollReveal } from '~/composables/useScrollReveal'

interface Frame { photo: CoverPhoto; caption: string }

const frames: Frame[] = [
  { photo: coverPhotos.creator, caption: 'Graba o diseña — el creador marca el ritmo de la semana.' },
  { photo: coverPhotos.manager, caption: 'El manager reparte el trabajo entre todo su roster.' },
  { photo: localPhotos.onboarding, caption: 'La marca revisa y aprueba antes de que salga nada.' },
  { photo: localPhotos.metrics, caption: 'Las métricas y la predicción de éxito llegan solas.' },
  { photo: coverPhotos.client, caption: 'Y la marca ve crecer el resultado real, no una maqueta.' }
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
  <section ref="section" class="relative bg-[var(--color-primary-900)] overflow-hidden">
    <div class="min-h-dvh flex flex-col justify-center py-16 md:py-0">
      <div ref="heading" class="px-5 md:px-10 lg:px-16 max-w-7xl mx-auto w-full mb-8 md:mb-10 overflow-hidden">
        <p data-reveal class="text-[0.8125rem] font-medium text-[var(--color-logo-teal)] mb-2">Una entrega, cinco miradas</p>
        <h3 class="font-display font-light text-[clamp(1.5rem,3.6vw,2.5rem)] text-white max-w-[30ch]">
          <span data-reveal class="block">Lo mismo se ve distinto según quién lo mira — FEEDMA lo enseña todo a la vez.</span>
        </h3>
      </div>

      <div aria-hidden="true" class="h-2.5 w-full nx-sprocket mb-5 md:mb-7" />

      <div ref="viewport" class="overflow-x-auto md:overflow-hidden snap-x snap-mandatory md:snap-none nx-scroll">
        <div ref="track" class="flex gap-5 md:gap-7 px-5 md:px-10 lg:px-16 w-max will-change-transform">
          <div
            v-for="(frame, i) in frames" :key="frame.caption"
            class="relative shrink-0 w-[78vw] max-w-[22rem] h-[56vh] md:h-[60vh] rounded-[var(--radius-lg)] overflow-hidden snap-center"
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
</style>

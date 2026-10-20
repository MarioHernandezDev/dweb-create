<script setup lang="ts">
import { useGsap, prefersReducedMotion } from '~/composables/useGsap'

const lines = [
  'Una campaña no es una entrega.',
  'Es una idea, una grabación, una revisión, una fecha y una publicación.',
  'FEEDMA sigue cada fase, en el mismo sitio.'
]

const root = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!root.value) return
  const rows = root.value.querySelectorAll<HTMLElement>('[data-line]')

  if (prefersReducedMotion()) {
    rows.forEach((r) => (r.style.transform = 'translateY(0)'))
    return
  }

  const { gsap, ScrollTrigger } = useGsap()
  gsap.to(rows, {
    yPercent: 0,
    duration: 0.8,
    ease: 'power3.out',
    stagger: 0.12,
    scrollTrigger: {
      trigger: root.value,
      start: 'top 75%',
      once: true
    }
  })
})
</script>

<template>
  <section id="rodaje" ref="root" class="bg-[var(--color-ink)] px-5 md:px-10 lg:px-16 py-20 md:py-28">
    <div class="max-w-5xl mx-auto">
      <p
        v-for="line in lines" :key="line"
        class="overflow-hidden"
      >
        <span
          data-line
          class="block font-display font-light text-[clamp(1.5rem,4.4vw,3.25rem)] leading-[1.18] text-[var(--color-text)] will-change-transform"
          style="transform: translateY(100%)"
        >{{ line }}</span>
      </p>
    </div>
  </section>
</template>

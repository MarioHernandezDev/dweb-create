<script setup lang="ts">
import { useGsap, prefersReducedMotion } from '~/composables/useGsap'

const section = ref<HTMLElement | null>(null)
const wrapper = ref<SVGSVGElement | null>(null)
const arm = ref<SVGRectElement | null>(null)
const flash = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!section.value || !arm.value || !flash.value || !content.value) return

  if (prefersReducedMotion()) {
    arm.value.style.transform = 'rotate(0deg)'
    content.value.style.opacity = '1'
    return
  }

  const { gsap, ScrollTrigger } = useGsap()

  gsap.set(arm.value, { transformOrigin: '7% 50%', rotate: -18 })
  gsap.set(content.value, { opacity: 0, y: 16 })

  const tl = gsap.timeline({ paused: true })
  tl.to(arm.value, { rotate: 0, duration: 0.3, ease: 'power4.in' })
    .to(flash.value, { opacity: 0.85, duration: 0.04 }, '<')
    .to(wrapper.value, { x: 5, duration: 0.045, repeat: 3, yoyo: true }, '<')
    .to(flash.value, { opacity: 0, duration: 0.3 }, '>-0.02')
    .to(content.value, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.15')

  ScrollTrigger.create({
    trigger: section.value,
    start: 'top 60%',
    once: true,
    onEnter: () => tl.play()
  })
})
</script>

<template>
  <section ref="section" class="relative bg-gradient-to-b from-[#0a0812] to-[var(--color-primary-900)] px-5 md:px-10 py-24 md:py-32 overflow-hidden">
    <div aria-hidden="true" class="absolute -bottom-32 left-1/2 -translate-x-1/2 size-[36rem] rounded-full blur-[120px] opacity-20" style="background: radial-gradient(circle, var(--color-primary-500), transparent 70%)" />

    <div class="relative max-w-lg mx-auto flex flex-col items-center text-center">
      <div class="relative w-40 md:w-48 mb-8 md:mb-10">
        <svg ref="wrapper" viewBox="0 0 220 150" class="w-full" aria-hidden="true">
          <defs>
            <pattern id="nx-clap-stripes" width="16" height="16" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="var(--color-logo-amber)" />
              <rect width="8" height="16" fill="var(--color-primary-900)" />
            </pattern>
          </defs>

          <!-- Tablero -->
          <rect x="14" y="54" width="192" height="80" rx="10" fill="var(--color-ink-raised)" stroke="rgb(255 255 255 / 10%)" />
          <!-- Barra fija -->
          <rect x="14" y="38" width="192" height="16" rx="4" fill="url(#nx-clap-stripes)" />
          <!-- Brazo con bisagra: empieza abierto, cierra de golpe -->
          <rect ref="arm" x="14" y="38" width="192" height="16" rx="4" fill="url(#nx-clap-stripes)" stroke="var(--color-primary-900)" stroke-width="0.5" />
          <circle cx="20" cy="46" r="3.5" fill="var(--color-primary-900)" />
        </svg>
        <!-- Destello de impacto, acotado a la claqueta -->
        <div ref="flash" aria-hidden="true" class="pointer-events-none absolute -inset-6 rounded-full bg-white opacity-0 blur-md" />
      </div>

      <div ref="content">
        <span class="inline-block font-display text-[0.75rem] tracking-[0.08em] text-[var(--color-logo-amber)] mb-4">ACCIÓN</span>
        <h3 class="font-display font-light text-[clamp(1.75rem,4.4vw,2.75rem)] leading-[1.15] text-white mb-4">
          Tu próxima entrega, sin dramas de producción.
        </h3>
        <p class="text-white/65 text-[0.9375rem] leading-relaxed max-w-[42ch] mx-auto mb-9">
          Entra con tu cuenta o crea una nueva — da igual si eres partner o creador de contenido.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
          <BaseButton to="/onboarding" variant="primary" size="lg" icon="ph:arrow-right-bold" class="w-full sm:w-auto sm:px-9">
            Crear una cuenta
          </BaseButton>
          <NuxtLink to="/login" class="text-[0.875rem] text-white/60 hover:text-white underline underline-offset-4 decoration-white/30">
            Ya tengo cuenta
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { platformMeta } from '~/utils/mock-data'
import { useScrollReveal } from '~/composables/useScrollReveal'

const root = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!root.value) return
  const { reveal } = useScrollReveal()
  reveal(root.value.querySelectorAll('[data-platform]'), { stagger: 0.06 })
})
</script>

<template>
  <section id="redes" ref="root" class="relative isolate overflow-hidden bg-[var(--color-ink-overlay)] px-5 md:px-10 lg:px-16 py-20 md:py-28">
    <svg aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1200 500" preserveAspectRatio="none">
      <defs>
        <symbol id="nx-ant-integrations" viewBox="0 0 20 12">
          <g fill="none" stroke="var(--color-primary-600)" stroke-width="1" stroke-linecap="round">
            <path d="M9 7 L6 10.5 M9 7 L7 3 M12 7 L13 10.5 M12 7 L13 3" />
            <path d="M15.5 4.8 L18.5 3 M15.5 5.6 L18.8 6.2" />
          </g>
          <ellipse cx="5" cy="6" rx="3.6" ry="3" fill="var(--color-primary-500)" />
          <ellipse cx="10.3" cy="6" rx="2.3" ry="2.1" fill="var(--color-primary-500)" />
          <ellipse cx="14.6" cy="6" rx="1.9" ry="1.9" fill="var(--color-primary-500)" />
        </symbol>
      </defs>

      <path
        d="M -40 430 C 140 395, 260 460, 440 425 S 760 380, 900 420 S 1100 455, 1240 410"
        fill="none" stroke="var(--color-logo-amber)" stroke-width="2.5" stroke-linecap="round"
        stroke-dasharray="1 13" opacity="0.5"
      />

      <use href="#nx-ant-integrations" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: 0s" />
      <use href="#nx-ant-integrations" class="nx-ant" width="22" height="13" transform="translate(-11 -6.5)" style="animation-delay: -10s" />
    </svg>

    <div class="max-w-6xl mx-auto">
      <p class="text-[0.8125rem] font-medium text-[var(--color-primary-500)] mb-2">Conecta tus redes</p>
      <h3 class="font-display font-light text-[clamp(1.5rem,3.2vw,2.25rem)] text-[var(--color-text)] max-w-[32ch] mb-3">
        Seis redes, una sola pantalla de métricas.
      </h3>
      <p class="text-[0.9375rem] text-[var(--color-text-muted)] leading-relaxed max-w-[52ch] mb-12 md:mb-14">
        Ya puedes enlazar cada cuenta a mano desde tu perfil de creador de contenido. La sincronización automática de seguidores y métricas por API está en camino.
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5">
        <div
          v-for="platform in Object.keys(platformMeta)" :key="platform" data-platform
          class="bg-[var(--color-ink-raised)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] p-5 flex flex-col gap-4"
        >
          <span
            class="flex items-center justify-center size-11 rounded-full"
            :style="{ background: `color-mix(in oklab, ${platformMeta[platform as keyof typeof platformMeta].colorVar} 16%, transparent)`, color: platformMeta[platform as keyof typeof platformMeta].colorVar }"
          >
            <Icon :name="platformMeta[platform as keyof typeof platformMeta].icon" class="size-5" />
          </span>
          <div>
            <p class="text-[0.9375rem] font-medium text-[var(--color-text)] mb-1">{{ platformMeta[platform as keyof typeof platformMeta].label }}</p>
            <p class="text-[0.75rem] text-[var(--color-status-published)] flex items-center gap-1">
              <Icon name="ph:check-circle-fill" class="size-3.5" />
              Conexión manual disponible
            </p>
          </div>
        </div>
      </div>

      <div class="mt-8 flex items-center gap-2.5 text-[0.8125rem] text-[var(--color-text-faint)]">
        <Icon name="ph:clock-bold" class="size-4 shrink-0" />
        Próximamente: sincronización automática por API, sin tener que actualizar tú los números.
      </div>
    </div>
  </section>
</template>

<style scoped>
.nx-ant {
  offset-path: path('M -40 430 C 140 395, 260 460, 440 425 S 760 380, 900 420 S 1100 455, 1240 410');
  offset-rotate: auto;
  animation: nx-ant-walk 22s linear infinite;
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

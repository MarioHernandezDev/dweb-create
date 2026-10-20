<script setup lang="ts">
import { useScroll } from '@vueuse/core'

const { y } = useScroll(import.meta.client ? window : undefined)
const scrolled = computed(() => y.value > 40)

const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))

const links = [
  { to: '/#rodaje', label: 'Rodaje', icon: 'ph:clapperboard' },
  { to: '/#equipo', label: 'Equipo', icon: 'ph:users-three' },
  { to: '/instalaciones', label: 'Instalaciones', icon: 'ph:film-reel' }
]
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-[var(--ease-spring)]"
    :class="scrolled || open
      ? 'bg-[#100b1d]/85 backdrop-blur-xl border-b border-white/25 shadow-[0_8px_30px_-15px_rgb(0_0_0/60%)]'
      : 'bg-[#100b1d]/55 backdrop-blur-xl border-b border-white/20 shadow-[0_8px_30px_-15px_rgb(0_0_0/45%)]'"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-[4.5rem] md:px-10">
      <NuxtLink to="/" class="flex h-full shrink-0 items-center gap-2.5" @click="open = false">
          <NuxtImg src="/img/logo-svg.png" alt="" width="26" height="26" class="size-6 md:size-7" />
          <span class="font-display text-[1rem] tracking-[0.02em] text-white/90 md:text-[1.0625rem]">FEEDMA</span>
        </NuxtLink>

        <nav class="hidden h-full items-center gap-1 md:flex">
          <NuxtLink
            v-for="link in links" :key="link.to" :to="link.to"
            class="flex h-full items-center  px-3.5 text-[0.8125rem] font-medium text-white/70 transition-[background-color,color] duration-200 hover:bg-white/10 hover:text-white"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div class="hidden h-full items-center gap-1 md:flex">
          <NuxtLink
            to="/onboarding"
            class="flex h-full items-center px-3.5 text-[0.8125rem] font-medium text-white/60 transition-[background-color,color] duration-200 hover:bg-white/10 hover:text-white"
          >
            Registro
          </NuxtLink>
          <NuxtLink to="/login" class="flex h-full items-center px-2">
            <span class="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--color-primary-500)] px-3.5 text-[0.8125rem] font-medium text-white shadow-[0_8px_20px_-8px_var(--color-primary-500)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[var(--color-primary-400)] active:scale-[0.97]">
              <Icon name="ph:user-circle-fill" class="size-4" />
              <span>Acceder</span>
            </span>
          </NuxtLink>
        </div>

        <button
          type="button" :aria-label="open ? 'Cerrar menú' : 'Abrir menú'"
          class="flex h-full w-12 items-center justify-center rounded-full transition-colors hover:bg-white/10 md:hidden"
          :class="scrolled || open ? 'text-[var(--color-text)]' : 'text-white'"
          @click="open = !open"
        >
          <Icon :name="open ? 'ph:x-bold' : 'ph:list-bold'" class="size-5" />
        </button>
    </div>

    <Transition
      enter-active-class="transition-[opacity,transform] duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="open" class="border-t border-[var(--color-hairline)] bg-[var(--color-ink)]/95 px-5 py-4 backdrop-blur-xl md:hidden">
        <NuxtLink
          v-for="link in links" :key="link.to" :to="link.to"
          class="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-ink-overlay)]"
          @click="open = false"
        >
          <Icon :name="link.icon" class="size-5 text-[var(--color-primary-500)]" />
          <span>{{ link.label }}</span>
        </NuxtLink>
        <div class="my-3 h-px bg-[var(--color-hairline)]" />
        <NuxtLink to="/onboarding" class="flex min-h-12 items-center rounded-xl px-3 text-[0.9375rem] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-ink-overlay)]" @click="open = false">
          Registro
        </NuxtLink>
        <BaseButton to="/login" variant="primary" size="md" icon="ph:user-circle-fill" class="mt-2 w-full rounded-full">Acceder</BaseButton>
      </div>
    </Transition>
  </header>
</template>

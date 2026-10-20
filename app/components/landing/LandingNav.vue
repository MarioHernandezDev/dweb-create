<script setup lang="ts">
import { useScroll } from '@vueuse/core'

const { y } = useScroll(import.meta.client ? window : undefined)
const scrolled = computed(() => y.value > 40)

const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))

const links = [
  { to: '/#rodaje', label: 'Cómo funciona' },
  { to: '/#equipo', label: 'Para quién' },
  { to: '/instalaciones', label: 'Instalaciones' }
]
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-[var(--ease-spring)]"
    :class="scrolled || open
      ? 'bg-[var(--color-ink)]/90 backdrop-blur-md border-b border-[var(--color-hairline)] shadow-[0_4px_24px_-12px_rgb(25_14_65/18%)]'
      : 'bg-transparent border-b border-transparent'"
  >
    <div class="max-w-7xl mx-auto px-5 md:px-10 h-16 md:h-[4.5rem] flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2.5 shrink-0" @click="open = false">
        <NuxtImg src="/img/logo-svg.png" alt="" width="26" height="26" class="size-6 md:size-7" />
        <span
          class="font-display text-[1rem] md:text-[1.0625rem] tracking-[0.02em] transition-colors duration-300"
          :class="scrolled || open ? 'text-[var(--color-text)]' : 'text-white/90'"
        >FEEDMA</span>
      </NuxtLink>

      <nav class="hidden md:flex items-center gap-7">
        <NuxtLink
          v-for="link in links" :key="link.to" :to="link.to"
          class="text-[0.875rem] font-medium transition-colors duration-200"
          :class="scrolled ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]' : 'text-white/70 hover:text-white'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="hidden md:flex items-center gap-5">
        <NuxtLink
          to="/onboarding"
          class="text-[0.8125rem] font-medium transition-colors duration-200"
          :class="scrolled ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]' : 'text-white/60 hover:text-white'"
        >
          Crear cuenta
        </NuxtLink>
        <BaseButton to="/login" variant="primary" size="sm">Acceder</BaseButton>
      </div>

      <button
        type="button" aria-label="Abrir menú" class="md:hidden size-9 flex items-center justify-center rounded-[var(--radius-xs)]"
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
      <div v-if="open" class="md:hidden bg-[var(--color-ink)] border-t border-[var(--color-hairline)] px-5 py-5 flex flex-col gap-4">
        <NuxtLink
          v-for="link in links" :key="link.to" :to="link.to"
          class="text-[0.9375rem] font-medium text-[var(--color-text)]" @click="open = false"
        >
          {{ link.label }}
        </NuxtLink>
        <div class="h-px bg-[var(--color-hairline)] my-1" />
        <NuxtLink to="/onboarding" class="text-[0.9375rem] font-medium text-[var(--color-text-muted)]" @click="open = false">
          Crear cuenta
        </NuxtLink>
        <BaseButton to="/login" variant="primary" size="md" class="w-full">Acceder</BaseButton>
      </div>
    </Transition>
  </header>
</template>

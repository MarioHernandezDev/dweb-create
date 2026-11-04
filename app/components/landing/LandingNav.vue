<script setup lang="ts">
import { useScroll } from '@vueuse/core'

const { y } = useScroll(import.meta.client ? window : undefined)
const scrolled = computed(() => y.value > 10)

const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))

watch(open, (value) => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = value ? 'hidden' : ''
})
onUnmounted(() => {
  if (import.meta.client) document.documentElement.style.overflow = ''
})

const links = [
  { to: '/instalaciones', label: 'Integraciones', icon: 'ph:film-reel' }
]

const isActive = (to: string) => !to.includes('#') && route.path === to
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 border-b border-[var(--color-hairline)] bg-white transition-shadow duration-300"
    :class="scrolled || open ? 'shadow-[0_8px_24px_-16px_rgb(26_22_37/16%)]' : ''"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-[4.5rem] md:px-10">
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2.5" @click="open = false">
        <BrandMark :size="28" />
      </NuxtLink>

      <nav class="hidden h-full items-center md:flex" aria-label="Principal">
        <NuxtLink
          v-for="link in links" :key="link.to" :to="link.to"
          class="flex h-full items-center px-4 font-display text-[1.0625rem] font-light tracking-[0.02em] transition-colors duration-150"
          :class="isActive(link.to)
            ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)] hover:text-[var(--color-text)]'"
          :aria-current="isActive(link.to) ? 'page' : undefined"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="hidden items-center md:flex">
        <BaseButton
          to="/login" variant="primary" size="md" icon="ph:user-circle-fill"
          class="shadow-[0_10px_24px_-10px_var(--color-primary-500)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-10px_var(--color-primary-500)]"
        >
          Acceder
        </BaseButton>
      </div>

      <button
        type="button" :aria-label="open ? 'Cerrar menú' : 'Abrir menú'" :aria-expanded="open"
        class="flex size-10 items-center justify-center rounded-full text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-ink-overlay)] md:hidden"
        @click="open = !open"
      >
        <Icon :name="open ? 'ph:x-bold' : 'ph:list-bold'" class="size-5" />
      </button>
    </div>

    <Transition
      enter-active-class="transition-opacity duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/20 md:hidden" @click="open = false" />
    </Transition>

    <Transition
      enter-active-class="transition-[opacity,transform] duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition-[opacity,transform] duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0 -translate-y-2"
    >
      <nav
        v-if="open" aria-label="Principal móvil"
        class="relative z-50 border-t border-[var(--color-hairline)] bg-white px-5 py-5 md:hidden"
      >
        <NuxtLink
          v-for="link in links" :key="link.to" :to="link.to"
          class="flex min-h-12 items-center gap-3 rounded-xl px-3 font-display text-base font-light tracking-[0.02em] transition-colors duration-150"
          :class="isActive(link.to)
            ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
            : 'text-[var(--color-text)] hover:bg-[var(--color-ink-overlay)]'"
          :aria-current="isActive(link.to) ? 'page' : undefined"
          @click="open = false"
        >
          <Icon :name="link.icon" class="size-5" :class="isActive(link.to) ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-faint)]'" />
          <span>{{ link.label }}</span>
        </NuxtLink>
        <div class="my-3 h-px bg-[var(--color-hairline)]" />
        <BaseButton to="/login" variant="primary" size="lg" icon="ph:user-circle-fill" class="mt-3 w-full" @click="open = false">
          Acceder
        </BaseButton>
      </nav>
    </Transition>
  </header>
</template>

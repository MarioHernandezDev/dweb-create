<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; title: string; /** Hoja ancha para contenido denso (p. ej. paneles con gráficas). Por defecto, estrecha. */ wide?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}

// Gestión de foco de un diálogo modal de verdad (patrón WAI-ARIA): al abrir,
// el foco entra en la hoja (si no, un usuario de teclado/lector de pantalla
// se queda "detrás" del backdrop, sin saber que algo se ha abierto); Escape
// cierra, igual que el click en el backdrop o el botón "Cerrar"; al cerrar,
// el foco vuelve exactamente a donde estaba (el botón que abrió la hoja),
// en vez de perderse en el body. Antes no había nada de esto — la única
// forma de cerrar con teclado era llegar a tabs hasta el botón "Cerrar".
const sheetEl = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  async (open) => {
    if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
    if (!import.meta.client) return

    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      // Enfoca el primer elemento enfocable de la hoja (normalmente el botón
      // "Cerrar") — si no hay ninguno, el propio contenedor del diálogo.
      const focusable = sheetEl.value?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      ;(focusable ?? sheetEl.value)?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  }
)

onUnmounted(() => {
  if (import.meta.client) document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-250 ease-[var(--ease-spring)]" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-[var(--ease-spring)]" leave-from-class="opacity-100" leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" @click="close" />
    </Transition>

    <Transition
      enter-active-class="transition-[transform,opacity] duration-[350ms] ease-[var(--ease-spring-out)]" enter-from-class="translate-y-full md:translate-y-4 md:opacity-0" enter-to-class="translate-y-0 md:opacity-100"
      leave-active-class="transition-[transform,opacity] duration-200 ease-[var(--ease-spring)]" leave-from-class="translate-y-0" leave-to-class="translate-y-full md:translate-y-4 md:opacity-0"
    >
      <div
        v-if="modelValue" ref="sheetEl"
        class="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center outline-none"
        role="dialog" aria-modal="true" :aria-label="title" tabindex="-1"
      >
        <div class="bg-[var(--color-ink-raised)] rounded-t-[var(--radius-lg)] md:rounded-[var(--radius-lg)] w-full md:mx-auto border border-[var(--color-hairline)] shadow-[var(--shadow-float)] max-h-[88dvh] flex flex-col" :class="wide ? 'md:max-w-4xl' : 'md:max-w-md'">
          <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--color-hairline)] shrink-0">
            <span class="mx-auto md:hidden h-1 w-9 rounded-full bg-[var(--color-hairline-strong)] absolute top-2 left-1/2 -translate-x-1/2" />
            <h2 class="font-display text-[1.0625rem] text-[var(--color-text)]">{{ title }}</h2>
            <button type="button" aria-label="Cerrar" class="size-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-ink-overlay)]" @click="close">
              <Icon name="ph:x-bold" class="size-4" />
            </button>
          </div>
          <div class="relative overflow-y-auto px-5 py-5 nx-scroll">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

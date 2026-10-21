<script setup lang="ts">
/**
 * Renderiza el diálogo que pilota useConfirm.ts — montado una sola vez en
 * AppShell.vue (mismo criterio que arrancar Realtime desde TopBar.vue: un
 * único punto de montaje fijo en toda la app). Mismo patrón visual que
 * BottomSheet.vue (Teleport + Transition + mismos tokens de color/sombra),
 * pero centrado y compacto: esto es una alerta sí/no, no un formulario.
 */
const { state, resolve } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0"
    >
      <div
        v-if="state.open" class="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/55 backdrop-blur-[2px]"
        role="alertdialog" aria-modal="true" :aria-label="state.title"
        @click.self="resolve(false)"
      >
        <Transition
          appear
          enter-active-class="transition-[transform,opacity] duration-[250ms] ease-[var(--ease-spring-out)]" enter-from-class="scale-95 opacity-0"
          leave-active-class="transition-[transform,opacity] duration-150 ease-[var(--ease-spring)]" leave-to-class="scale-95 opacity-0"
        >
          <div class="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] shadow-[var(--shadow-float)] p-6">
            <div class="flex items-start gap-3.5 mb-5">
              <span
                class="shrink-0 size-10 rounded-full flex items-center justify-center"
                :class="state.tone === 'danger' ? 'bg-[var(--color-status-alert)]/12' : 'bg-[var(--color-primary-500)]/12'"
              >
                <Icon :name="state.icon" class="size-5" :class="state.tone === 'danger' ? 'text-[var(--color-status-alert)]' : 'text-[var(--color-primary-500)]'" />
              </span>
              <div class="min-w-0 pt-1">
                <p class="font-display text-[1.0625rem] text-[var(--color-text)]">{{ state.title }}</p>
                <p v-if="state.message" class="text-[0.875rem] text-[var(--color-text-muted)] mt-1.5 leading-relaxed">{{ state.message }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2.5">
              <BaseButton variant="secondary" size="md" class="flex-1" @click="resolve(false)">{{ state.cancelLabel }}</BaseButton>
              <BaseButton :variant="state.tone === 'danger' ? 'danger' : 'primary'" size="md" class="flex-1" @click="resolve(true)">
                {{ state.confirmLabel }}
              </BaseButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

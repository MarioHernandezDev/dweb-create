<script setup lang="ts">
/**
 * Pinta los avisos de useToast.ts — montado una sola vez en AppShell.vue (como
 * ConfirmDialogHost). Zona `aria-live` para que los lectores de pantalla
 * anuncien cada aviso sin robar el foco; los errores son `role="alert"`.
 * Solo animan opacidad/posición (`prefers-reduced-motion` ya lo reduce a ~0 ms).
 */
const { toasts, dismiss } = useToast()

const meta = {
  success: { icon: 'ph:check-circle-fill', color: 'var(--color-status-published)' },
  error: { icon: 'ph:warning-circle-fill', color: 'var(--color-status-alert)' },
  info: { icon: 'ph:info-fill', color: 'var(--color-text-muted)' }
} as const
</script>

<template>
  <div class="fixed z-[70] inset-x-4 bottom-24 md:bottom-6 md:inset-x-auto md:right-6 md:w-96 flex flex-col gap-2 pointer-events-none" aria-live="polite" data-toast-host>
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts" :key="t.id" :role="t.tone === 'error' ? 'alert' : 'status'" :data-toast="t.tone"
        class="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-paper)] px-4 py-3 shadow-[var(--shadow-float)]"
      >
        <Icon :name="meta[t.tone].icon" class="size-5 shrink-0 mt-px" :style="{ color: meta[t.tone].color }" />
        <p class="min-w-0 flex-1 text-[0.875rem] text-[var(--color-text)] leading-snug">{{ t.text }}</p>
        <NuxtLink v-if="t.action" :to="t.action.to" class="shrink-0 text-[0.8125rem] font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] underline underline-offset-2" @click="dismiss(t.id)">{{ t.action.label }}</NuxtLink>
        <button type="button" class="shrink-0 -mr-1 size-6 flex items-center justify-center rounded-full text-[var(--color-text-faint)] hover:text-[var(--color-text)]" aria-label="Cerrar aviso" @click="dismiss(t.id)">
          <Icon name="ph:x-bold" class="size-3" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>

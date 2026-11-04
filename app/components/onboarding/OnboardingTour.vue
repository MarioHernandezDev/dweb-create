<script setup lang="ts">
/**
 * Diálogo del recorrido de bienvenida (M-O1), montado una sola vez en
 * AppShell.vue — mismo criterio que ConfirmDialogHost.vue: un componente fijo
 * que decide solo si mostrarse. Saltable en cualquier paso, nunca bloquea la app.
 */
const { open, stepIndex, steps, current, isLast, maybeAutoStart, next, back, close } = useOnboardingTour()
const { role, ensureRole } = useMyRole()
const { resolveMyProfileId } = useMyProfileId()
const router = useRouter()

const primaryBtn = ref<{ $el: HTMLElement } | null>(null)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(open, async (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) {
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    primaryBtn.value?.$el?.focus?.()
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onMounted(async () => {
  const [id, myRole] = await Promise.all([resolveMyProfileId(), ensureRole()])
  if (id && myRole) maybeAutoStart(id, myRole)
})

onUnmounted(() => {
  if (import.meta.client) document.removeEventListener('keydown', onKeydown)
})

function goToAction() {
  const to = current.value?.action?.to
  close()
  if (to) router.push(to)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-[var(--ease-spring)]" enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-[var(--ease-spring)]" leave-to-class="opacity-0"
    >
      <div
        v-if="open && current" class="fixed inset-0 z-[90] flex items-center justify-center p-5 bg-black/55 backdrop-blur-[2px]"
        role="dialog" aria-modal="true" aria-labelledby="tour-title"
      >
        <div class="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] shadow-[var(--shadow-float)] p-6">
          <div class="flex items-center justify-between mb-5">
            <p class="text-micro font-medium text-[var(--color-text-faint)]" aria-live="polite">
              Paso {{ stepIndex + 1 }} de {{ steps.length }}
            </p>
            <button type="button" class="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]" @click="close">
              Saltar
            </button>
          </div>

          <span class="inline-flex size-12 items-center justify-center rounded-full bg-[var(--color-primary-500)]/12 text-[var(--color-primary-500)] mb-4">
            <Icon :name="current.icon" class="size-6" />
          </span>
          <h2 id="tour-title" class="font-display text-[1.375rem] leading-tight text-[var(--color-text)] mb-2">{{ current.title }}</h2>
          <p class="text-base text-[var(--color-text-muted)] leading-relaxed mb-6">{{ current.body }}</p>

          <div class="flex items-center gap-1.5 mb-6" aria-hidden="true">
            <span
              v-for="(_, i) in steps" :key="i" class="h-1.5 rounded-full transition-all"
              :class="i === stepIndex ? 'w-6 bg-[var(--color-primary-500)]' : 'w-1.5 bg-[var(--color-hairline-strong)]'"
            />
          </div>

          <div class="flex items-center gap-2.5">
            <BaseButton v-if="stepIndex > 0" variant="secondary" size="md" @click="back">Atrás</BaseButton>
            <BaseButton v-if="isLast && current.action" variant="secondary" size="md" class="flex-1" @click="close">Luego</BaseButton>
            <BaseButton
              v-if="isLast && current.action" ref="primaryBtn" variant="primary" size="md" class="flex-1" @click="goToAction"
            >
              {{ current.action.label }}
            </BaseButton>
            <BaseButton v-else ref="primaryBtn" variant="primary" size="md" class="flex-1" @click="next">
              {{ isLast ? 'Terminar' : 'Siguiente' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

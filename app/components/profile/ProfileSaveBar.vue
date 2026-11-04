<script setup lang="ts">
/**
 * Barra de guardado fija de la ficha pública (A-R18c). Aparece al haber
 * cambios sin guardar (o durante 3 s tras guardar, con el resultado) para que
 * Guardar no quede lejos al final de un formulario largo. Si hay errores de
 * validación, Guardar queda desactivado y se dice por qué (no se deja pulsar
 * y fallar en silencio).
 */
const props = defineProps<{ dirty: boolean; saving: boolean; saved: boolean; blockedReason?: string | null; error?: string }>()
const emit = defineEmits<{ save: []; discard: [] }>()

const visible = computed(() => props.dirty || props.saved || !!props.error)
</script>

<template>
  <Transition name="profile-savebar">
    <div
      v-if="visible"
      class="sticky bottom-20 md:bottom-4 z-20 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-hairline-strong)] bg-[var(--color-paper)] px-4 py-3 shadow-lg"
      role="status" aria-live="polite" data-save-bar
    >
      <p v-if="error" class="text-sm text-[var(--color-status-alert)]" data-save-error>{{ error }}</p>
      <p v-else-if="dirty && blockedReason" class="text-sm text-[var(--color-status-alert)]" data-save-blocked>{{ blockedReason }}</p>
      <p v-else-if="dirty" class="inline-flex items-center gap-2 text-sm text-[var(--color-text)]" data-save-dirty>
        <span class="size-2 rounded-full bg-[var(--color-primary-500)]" aria-hidden="true" /> Cambios sin guardar
      </p>
      <p v-else class="inline-flex items-center gap-2 text-sm text-[var(--color-status-published)]" data-save-done>
        <Icon name="ph:check-circle-fill" class="size-4" /> Cambios guardados
      </p>

      <div v-if="dirty" class="flex items-center gap-2">
        <BaseButton variant="ghost" size="sm" :disabled="saving" data-save-discard @click="emit('discard')">Descartar</BaseButton>
        <BaseButton variant="primary" size="sm" :icon-spin="saving" :disabled="saving || !!blockedReason" data-save-submit @click="emit('save')">
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </BaseButton>
      </div>
    </div>
  </Transition>
</template>

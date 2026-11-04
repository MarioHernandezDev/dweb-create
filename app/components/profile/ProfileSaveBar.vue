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
    <div v-if="visible" class="savebar" :data-state="error || (dirty && blockedReason) ? 'error' : dirty ? 'dirty' : 'done'" role="status" aria-live="polite" data-save-bar>
      <p v-if="error" class="savebar__msg" data-save-error>{{ error }}</p>
      <p v-else-if="dirty && blockedReason" class="savebar__msg" data-save-blocked>{{ blockedReason }}</p>
      <p v-else-if="dirty" class="savebar__msg" data-save-dirty>Cambios sin guardar</p>
      <p v-else class="savebar__msg" data-save-done><Icon name="ph:check-circle-fill" class="size-4" /> Cambios guardados</p>

      <div v-if="dirty" class="savebar__actions">
        <BaseButton variant="ghost" size="sm" :disabled="saving" data-save-discard @click="emit('discard')">Descartar</BaseButton>
        <BaseButton variant="brand" size="sm" :loading="saving" :disabled="!!blockedReason" data-save-submit @click="emit('save')">
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </BaseButton>
      </div>
    </div>
  </Transition>
</template>

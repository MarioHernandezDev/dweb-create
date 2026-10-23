<script setup lang="ts">
import { relativeTime } from '~/utils/status'
import type { CollaborationLogKind } from '~/composables/useCollaborationLog'

/**
 * Registro compartido de incidencias y cambios acordados (ver
 * supabase/migrations/20261025170000_collaboration_log.sql) — distinto de
 * "Reportar esta solicitud" en NegotiationPanel.vue (eso es confidencial al
 * admin); esto lo ven las dos partes. Un "cambio acordado" es solo
 * constancia escrita, nunca mueve ningún dato de la colaboración por sí
 * solo.
 */
const props = defineProps<{
  collaborationId: string
  counterpartName: string
}>()

const { entriesByCollaboration, ensureLoaded, addEntry } = useCollaborationLog()
const { resolveMyProfileId } = useMyProfileId()

const myProfileId = ref<string | null>(null)
const entries = computed(() => entriesByCollaboration.value[props.collaborationId] ?? [])

onMounted(async () => {
  myProfileId.value = await resolveMyProfileId()
  await ensureLoaded(props.collaborationId)
})

function authorLabel(authorProfileId: string) {
  return authorProfileId === myProfileId.value ? 'Tú' : props.counterpartName
}

const kindMeta: Record<CollaborationLogKind, { label: string; icon: string; color: string }> = {
  incident: { label: 'Incidencia', icon: 'ph:warning-circle-fill', color: 'var(--color-status-alert)' },
  agreed_change: { label: 'Cambio acordado', icon: 'ph:handshake-fill', color: 'var(--color-status-published)' }
}

const formOpen = ref(false)
const kind = ref<CollaborationLogKind>('incident')
const detail = ref('')
const submitting = ref(false)
const submitError = ref('')

const canSubmit = computed(() => detail.value.trim().length > 0 && detail.value.length <= 1000)

function openForm() {
  formOpen.value = true
  kind.value = 'incident'
  detail.value = ''
  submitError.value = ''
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await addEntry(props.collaborationId, kind.value, detail.value)
    formOpen.value = false
    detail.value = ''
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mb-5">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Registro de la colaboración</h3>
      <button v-if="!formOpen" type="button" class="text-[0.75rem] font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]" @click="openForm">
        Añadir entrada
      </button>
    </div>

    <p v-if="!entries.length && !formOpen" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed">
      Sin incidencias ni cambios acordados registrados todavía.
    </p>

    <ul v-if="entries.length" class="flex flex-col gap-2.5 mb-3">
      <li v-for="entry in entries" :key="entry.id" class="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3">
        <Icon :name="kindMeta[entry.kind].icon" class="size-4 shrink-0 mt-0.5" :style="{ color: kindMeta[entry.kind].color }" />
        <div class="min-w-0 flex-1">
          <p class="text-[0.8125rem] text-[var(--color-text)]">
            <span class="font-medium">{{ kindMeta[entry.kind].label }}</span>
            <span class="text-[var(--color-text-faint)]"> · {{ authorLabel(entry.authorProfileId) }} · {{ relativeTime(entry.createdAt) }}</span>
          </p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mt-0.5">{{ entry.detail }}</p>
        </div>
      </li>
    </ul>

    <div v-if="formOpen" class="flex flex-col gap-2.5 p-3.5 rounded-[var(--radius-md)] bg-[var(--color-ink-overlay)]/60 border border-[var(--color-hairline)]">
      <div class="flex gap-2">
        <button
          v-for="k in (['incident', 'agreed_change'] as const)" :key="k" type="button"
          class="flex-1 h-9 rounded-[var(--radius-xs)] text-[0.8125rem] font-medium border transition-colors"
          :class="kind === k
            ? 'bg-[var(--color-primary-500)]/15 border-[var(--color-primary-500)]/50 text-[var(--color-primary-500)]'
            : 'bg-[var(--color-ink-raised)] border-[var(--color-hairline)] text-[var(--color-text-muted)]'"
          @click="kind = k"
        >
          {{ kindMeta[k].label }}
        </button>
      </div>
      <textarea
        v-model="detail" rows="2" maxlength="1000"
        :placeholder="kind === 'incident' ? 'Qué ha pasado…' : 'Qué habéis acordado…'"
        class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-raised)] border border-[var(--color-hairline)] text-[0.875rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
      />
      <p v-if="kind === 'agreed_change'" class="text-[0.75rem] text-[var(--color-text-faint)]">
        Esto deja constancia de lo que decís haber acordado — no cambia ningún dato de la colaboración por sí solo.
      </p>
      <div class="flex gap-2.5">
        <BaseButton variant="secondary" size="sm" class="flex-1" @click="formOpen = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="sm" class="flex-1" :disabled="!canSubmit || submitting" :icon-spin="submitting" @click="submit">
          Guardar
        </BaseButton>
      </div>
      <p v-if="submitError" class="text-[0.75rem] text-[var(--color-status-alert)]">{{ submitError }}</p>
    </div>
  </div>
</template>

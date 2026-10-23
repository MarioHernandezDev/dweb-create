<script setup lang="ts">
import { hasAnyTermsSpecified, hasAnyBriefSpecified, revisionsIncludedLabel, type CollaborationTerms } from '~/utils/collaboration-terms'

/**
 * "Condiciones pactadas" de una colaboración (ver supabase/migrations/
 * 20261025150000_collaboration_terms.sql) — compartido entre creator/
 * requests.vue y partner/requests.vue, pura lectura: estos datos se fijan
 * al enviar la propuesta y quedan congelados para siempre (un trigger lo
 * garantiza en la base de datos), así que este componente no tiene ninguna
 * acción de editar.
 */
const props = defineProps<{
  terms: CollaborationTerms
  collaborationId: string
}>()

const { revisionsRequestedForCollaboration } = usePostRevisions()
const requestedCount = ref<number | null>(null)

// Perezoso y no bloqueante: solo tiene sentido pedirlo si de verdad hay un
// número de revisiones incluidas que dar contexto, y nunca debe retrasar
// el render del resto de condiciones (que ya se tienen de sobra sin red).
onMounted(async () => {
  if (props.terms.revisionsIncluded !== null) {
    requestedCount.value = await revisionsRequestedForCollaboration(props.collaborationId)
  }
})
</script>

<template>
  <div class="mb-5">
    <h3 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-2">Sobre la campaña</h3>

    <p v-if="!hasAnyBriefSpecified(terms)" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed mb-4">
      No se especificó el objetivo, el público ni el tono al enviar esta propuesta — puedes pedir que se aclaren antes de decidir.
    </p>
    <dl v-else class="flex flex-col gap-2 text-[0.8125rem] mb-4">
      <div class="flex items-start justify-between gap-3">
        <dt class="text-[var(--color-text-muted)] shrink-0">Objetivo</dt>
        <dd class="text-[var(--color-text)] text-right">{{ terms.campaignGoal || 'No se especificó el objetivo' }}</dd>
      </div>
      <div class="flex items-start justify-between gap-3">
        <dt class="text-[var(--color-text-muted)] shrink-0">Público objetivo</dt>
        <dd class="text-[var(--color-text)] text-right">{{ terms.targetAudience || 'No se especificó' }}</dd>
      </div>
      <div class="flex items-start justify-between gap-3">
        <dt class="text-[var(--color-text-muted)] shrink-0">Tono</dt>
        <dd class="text-[var(--color-text)] text-right">{{ terms.tone || 'No se especificó' }}</dd>
      </div>
    </dl>

    <h3 class="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-2">Condiciones pactadas</h3>

    <p v-if="!hasAnyTermsSpecified(terms)" class="text-[0.8125rem] text-[var(--color-text-muted)] leading-relaxed">
      No se especificaron condiciones concretas al enviar esta propuesta — puedes pedir que se aclaren antes de decidir.
    </p>

    <dl v-else class="flex flex-col gap-2 text-[0.8125rem]">
      <div class="flex items-start justify-between gap-3">
        <dt class="text-[var(--color-text-muted)] shrink-0">Alcance</dt>
        <dd class="text-[var(--color-text)] text-right">{{ terms.scopeNotes || 'No se especificó el alcance' }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-[var(--color-text-muted)] shrink-0">Revisiones</dt>
        <dd class="text-[var(--color-text)] text-right">{{ revisionsIncludedLabel(terms.revisionsIncluded) }}</dd>
      </div>
      <div v-if="terms.revisionsIncluded !== null && requestedCount !== null" class="flex items-center justify-between gap-3">
        <dt class="text-[var(--color-text-muted)] shrink-0">Solicitudes de cambios registradas</dt>
        <dd class="text-[var(--color-text)] text-right">{{ requestedCount }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-[var(--color-text-muted)] shrink-0">Exclusividad</dt>
        <dd class="text-[var(--color-text)] text-right">{{ terms.exclusivity ? 'Exclusividad pactada' : 'Sin exclusividad pactada' }}</dd>
      </div>
      <div class="flex items-start justify-between gap-3">
        <dt class="text-[var(--color-text-muted)] shrink-0">Derechos de uso</dt>
        <dd class="text-[var(--color-text)] text-right">{{ terms.usageRights || 'No se especificaron — acláralo con la otra parte antes de usar el contenido' }}</dd>
      </div>
    </dl>
  </div>
</template>

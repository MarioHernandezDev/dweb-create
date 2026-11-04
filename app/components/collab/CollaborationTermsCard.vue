<script setup lang="ts">
import { hasAnyTermsSpecified, hasAnyBriefSpecified, revisionsIncludedLabel, type CollaborationTerms } from '~/utils/collaboration-terms'

/**
 * "Condiciones pactadas" de una colaboración (ver supabase/migrations/
 * 20261025150000_collaboration_terms.sql) — compartido entre creator/
 * requests.vue y partner/requests.vue. Estos datos se fijan al enviar la
 * propuesta. Regla «rellenar una vez» (Fase 2, migración 20261104110000):
 * un valor ya fijado no se cambia nunca; si quedó vacío, la marca puede
 * completarlo una vez tras aceptar (`canCompleteBrief`). Muestra además la
 * instantánea del paquete contratado, si la hay.
 */
const props = defineProps<{
  terms: CollaborationTerms
  collaborationId: string
  /** Con la colaboración ya aceptada, «antes de decidir» deja de tener sentido. */
  status?: string
  /** Instantánea del paquete contratado (solo colaboraciones nacidas de una oferta del chat). */
  packageInfo?: { title: string | null; description: string | null; deliverables: string[] | null }
  /** La marca de una colaboración aceptada o en curso puede completar lo que falte (D-1). */
  canCompleteBrief?: boolean
}>()

const decided = computed(() => !!props.status && props.status !== 'requested')

const hasPackage = computed(() => !!props.packageInfo?.title)

// Campos vacíos que la marca todavía puede completar. Lo ya fijado no se edita.
const emptyFields = computed(() => ({
  campaignGoal: !props.terms.campaignGoal,
  targetAudience: !props.terms.targetAudience,
  tone: !props.terms.tone,
  scopeNotes: !props.terms.scopeNotes,
  revisionsIncluded: props.terms.revisionsIncluded === null,
  usageRights: !props.terms.usageRights,
  exclusivity: !props.terms.exclusivity
}))
const anyEmpty = computed(() => Object.values(emptyFields.value).some(Boolean))
const showCompleteBrief = computed(() => !!props.canCompleteBrief && anyEmpty.value)

const { completeBrief } = useMyCollaborations()
const formOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({
  campaignGoal: '', targetAudience: '', tone: '', scopeNotes: '', usageRights: '',
  revisionsIncluded: null as number | null, exclusivity: false
})
const canSave = computed(() =>
  (emptyFields.value.campaignGoal && !!form.campaignGoal.trim())
  || (emptyFields.value.targetAudience && !!form.targetAudience.trim())
  || (emptyFields.value.tone && !!form.tone.trim())
  || (emptyFields.value.scopeNotes && !!form.scopeNotes.trim())
  || (emptyFields.value.usageRights && !!form.usageRights.trim())
  || (emptyFields.value.revisionsIncluded && typeof form.revisionsIncluded === 'number')
  || (emptyFields.value.exclusivity && form.exclusivity)
)

async function saveBrief() {
  if (!canSave.value || saving.value) return
  saving.value = true
  formError.value = ''
  try {
    const f = emptyFields.value
    await completeBrief(props.collaborationId, {
      campaignGoal: f.campaignGoal ? form.campaignGoal : null,
      targetAudience: f.targetAudience ? form.targetAudience : null,
      tone: f.tone ? form.tone : null,
      scopeNotes: f.scopeNotes ? form.scopeNotes : null,
      usageRights: f.usageRights ? form.usageRights : null,
      revisionsIncluded: f.revisionsIncluded && typeof form.revisionsIncluded === 'number' ? form.revisionsIncluded : null,
      exclusivity: f.exclusivity && form.exclusivity ? true : null
    })
    formOpen.value = false
  } catch (e) {
    formError.value = (e as { message?: string })?.message ?? 'No se ha podido guardar.'
  } finally {
    saving.value = false
  }
}

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
    <template v-if="hasPackage">
      <h3 class="text-sm font-semibold text-[var(--text-muted)] mb-2">Lo contratado</h3>
      <div class="mb-4 text-sm" data-collab-package>
        <p class="font-medium text-[var(--color-text)]">{{ packageInfo?.title }}</p>
        <p v-if="packageInfo?.description" class="text-[var(--color-text-muted)] leading-relaxed mt-1">{{ packageInfo.description }}</p>
        <ul v-if="packageInfo?.deliverables?.length" class="mt-2 list-disc pl-5 text-[var(--color-text)] flex flex-col gap-0.5">
          <li v-for="d in packageInfo.deliverables" :key="d">{{ d }}</li>
        </ul>
        <p class="text-micro text-[var(--color-text-faint)] mt-2">Copia fijada al aceptar la oferta: si el paquete cambia después, esto no.</p>
      </div>
    </template>

    <h3 class="text-sm font-semibold text-[var(--text-muted)] mb-2">Sobre la campaña</h3>

    <p v-if="!hasAnyBriefSpecified(terms)" class="text-sm text-[var(--color-text-muted)] leading-relaxed mb-4">
      {{ decided ? 'Esta colaboración se acordó sin objetivo, público ni tono definidos — conviene aclararlos con la otra parte por el chat.' : 'No se especificó el objetivo, el público ni el tono al enviar esta propuesta — puedes pedir que se aclaren antes de decidir.' }}
    </p>
    <dl v-else class="flex flex-col gap-2 text-sm mb-4">
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

    <h3 class="text-sm font-semibold text-[var(--text-muted)] mb-2">Condiciones pactadas</h3>

    <p v-if="!hasAnyTermsSpecified(terms)" class="text-sm text-[var(--color-text-muted)] leading-relaxed">
      {{ decided ? 'Se acordó sin condiciones concretas (alcance, revisiones, derechos de uso) — conviene dejarlas por escrito en el Registro.' : 'No se especificaron condiciones concretas al enviar esta propuesta — puedes pedir que se aclaren antes de decidir.' }}
    </p>

    <dl v-else class="flex flex-col gap-2 text-sm">
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

    <div v-if="showCompleteBrief" class="mt-4" data-brief-complete>
      <BaseButton v-if="!formOpen" variant="secondary" size="sm" icon="ph:pencil-simple" data-brief-open @click="formOpen = true">
        Completar el brief
      </BaseButton>
      <div v-else class="flex flex-col gap-2.5 p-3.5 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-ink-overlay)]">
        <p class="text-micro text-[var(--color-text-faint)]">
          Solo los campos vacíos, y solo una vez: lo que se guarde aquí ya no se podrá cambiar. El creador recibirá un aviso.
        </p>
        <input v-if="emptyFields.campaignGoal" v-model="form.campaignGoal" maxlength="500" placeholder="Objetivo de la campaña" aria-label="Objetivo de la campaña" data-brief-goal class="input w-full h-11">
        <input v-if="emptyFields.targetAudience" v-model="form.targetAudience" maxlength="500" placeholder="Público objetivo" aria-label="Público objetivo" class="input w-full h-11">
        <input v-if="emptyFields.tone" v-model="form.tone" maxlength="300" placeholder="Tono" aria-label="Tono" class="input w-full h-11">
        <textarea v-if="emptyFields.scopeNotes" v-model="form.scopeNotes" rows="2" maxlength="1000" placeholder="Alcance (qué se entrega)" aria-label="Alcance" class="textarea w-full resize-none" />
        <input v-if="emptyFields.revisionsIncluded" v-model.number="form.revisionsIncluded" type="number" min="0" max="20" step="1" placeholder="Revisiones incluidas (0–20)" aria-label="Revisiones incluidas" class="input w-full h-11">
        <textarea v-if="emptyFields.usageRights" v-model="form.usageRights" rows="2" maxlength="1000" placeholder="Derechos de uso" aria-label="Derechos de uso" class="textarea w-full resize-none" />
        <label v-if="emptyFields.exclusivity" class="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input v-model="form.exclusivity" type="checkbox"> Con exclusividad
        </label>
        <div class="flex gap-2.5">
          <BaseButton variant="secondary" size="sm" class="flex-1" @click="formOpen = false">Cancelar</BaseButton>
          <BaseButton variant="primary" size="sm" class="flex-1" :disabled="!canSave || saving" :icon-spin="saving" data-brief-save @click="saveBrief">Guardar</BaseButton>
        </div>
        <p v-if="formError" class="text-micro text-[var(--color-status-alert)]" role="alert">{{ formError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiscoveryResult } from '~/composables/useDiscover'

useHead({ title: 'Descubrir' })

const client = useSupabaseClient()
const { partner } = useMyPartner()

// Hallazgo #7: "Contactar" avisa de una solicitud ya enviada a ese mismo creador.
const { collaborations: myCollaborations, ensureLoaded: ensureCollaborationsLoaded } = useMyCollaborations()
const pendingCreatorIds = computed(() => myCollaborations.value.filter((c) => c.status === 'requested').map((c) => c.creatorId))
await ensureCollaborationsLoaded()

const sheetOpen = ref(false)
const sheetStage = ref<'form' | 'sent'>('form')
const target = ref<DiscoveryResult | null>(null)
const message = ref('')
const budgetEuros = ref<number | null>(null)
const sending = ref(false)

// "Detalles de la propuesta (opcional)" — ver supabase/migrations/
// 20261025150000_collaboration_terms.sql y 20261025180000_collaboration_
// brief_fields.sql. Se fijan aquí, al enviar, y quedan congeladas para
// siempre (un trigger lo garantiza en la base de datos) — no hay edición
// posterior. Colapsado por defecto: no es obligatorio rellenarlo.
const termsOpen = ref(false)
const campaignGoal = ref('')
const targetAudience = ref('')
const tone = ref('')
const scopeNotes = ref('')
const revisionsIncluded = ref<number | null>(null)
const exclusivity = ref(false)
const usageRights = ref('')

function openContact(creator: DiscoveryResult) {
  target.value = creator
  sheetStage.value = 'form'
  message.value = ''
  budgetEuros.value = null
  termsOpen.value = false
  campaignGoal.value = ''
  targetAudience.value = ''
  tone.value = ''
  scopeNotes.value = ''
  revisionsIncluded.value = null
  exclusivity.value = false
  usageRights.value = ''
  sheetOpen.value = true
}

async function send() {
  if (!target.value || !message.value || !budgetEuros.value || sending.value) return
  const me = partner.value
  if (!me) return

  sending.value = true
  const { error: insertError } = await client.from('collaborations').insert({
    partner_id: me.id,
    creator_id: target.value.id,
    initiated_by: 'partner',
    brief: message.value,
    budget_cents: Math.round(budgetEuros.value * 100),
    campaign_goal: campaignGoal.value.trim() || null,
    target_audience: targetAudience.value.trim() || null,
    tone: tone.value.trim() || null,
    scope_notes: scopeNotes.value.trim() || null,
    revisions_included: revisionsIncluded.value,
    exclusivity: exclusivity.value,
    usage_rights: usageRights.value.trim() || null
  } as never)
  sending.value = false

  if (insertError) {
    console.error('[discover] fallo al enviar la solicitud:', insertError.message)
    return
  }
  sheetStage.value = 'sent'
}
</script>

<template>
  <AppShell role="partner" title="Descubrir" subtitle="Contacta directo con un creador de contenido" full-width>
    <DiscoverBrowser kind="creator" cta-label="Contactar" :pending-ids="pendingCreatorIds" @contact="openContact" />

    <BottomSheet v-model="sheetOpen" :title="target ? `Contactar a ${target.name}` : 'Contactar'">
      <template v-if="sheetStage === 'form'">
        <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="brief">Cuéntales tu campaña</label>
        <textarea
          id="brief" v-model="message" rows="4" placeholder="Qué necesitas y para cuándo…"
          class="textarea w-full resize-none"
        />

        <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5 mt-4" for="budget">Presupuesto (€)</label>
        <input
          id="budget" v-model.number="budgetEuros" type="number" min="1" step="1" placeholder="Ej. 300"
          class="input w-full h-11"
        >
        <p class="text-micro text-[var(--color-text-faint)] mt-1.5">Lo pagas desde CIBERAN cuando acordéis los detalles — el dinero llega directo, descontando la comisión de la plataforma.</p>

        <button
          type="button"
          class="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] mt-4"
          @click="termsOpen = !termsOpen"
        >
          <Icon :name="termsOpen ? 'ph:caret-down-bold' : 'ph:caret-right-bold'" class="size-3.5" />
          Detalles de la propuesta (opcional)
        </button>
        <div v-if="termsOpen" class="flex flex-col gap-3 mt-3 p-3.5 rounded-[var(--radius-md)] bg-[var(--color-ink-overlay)]/60 border border-[var(--color-hairline)]">
          <p class="text-sm font-semibold text-[var(--text-muted)]">Sobre la campaña</p>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="campaign-goal">Objetivo</label>
            <textarea
              id="campaign-goal" v-model="campaignGoal" rows="2" placeholder="Qué buscáis conseguir con esta colaboración…"
              class="textarea w-full resize-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="target-audience">Público objetivo</label>
            <input
              id="target-audience" v-model="targetAudience" type="text" placeholder="Ej. mujeres 25-35, moda sostenible"
              class="input w-full h-10"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="tone">Tono</label>
            <input
              id="tone" v-model="tone" type="text" placeholder="Ej. cercano y divertido"
              class="input w-full h-10"
            >
          </div>

          <p class="text-sm font-semibold text-[var(--text-muted)] mt-2">Condiciones</p>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="scope-notes">Alcance (entregables concretos)</label>
            <textarea
              id="scope-notes" v-model="scopeNotes" rows="2" placeholder="Ej. 1 reel + 2 stories"
              class="textarea w-full resize-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="revisions">Revisiones incluidas</label>
            <input
              id="revisions" v-model.number="revisionsIncluded" type="number" min="0" step="1" placeholder="Déjalo en blanco si no hay límite"
              class="input w-full h-10"
            >
          </div>
          <label class="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input v-model="exclusivity" type="checkbox" class="size-4 accent-[var(--color-primary-500)]">
            Exclusividad (no trabajará con la competencia mientras dure)
          </label>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5" for="usage-rights">Derechos de uso del contenido</label>
            <textarea
              id="usage-rights" v-model="usageRights" rows="2" placeholder="Ej. uso en redes propias durante 6 meses"
              class="textarea w-full resize-none"
            />
          </div>
          <p class="text-micro text-[var(--color-text-faint)]">Quedan fijadas tal cual al enviar — no se pueden editar después.</p>
        </div>

        <BaseButton
          variant="primary" size="lg" class="w-full mt-4" :icon-spin="sending" :disabled="!message || !budgetEuros || sending"
          @click="send"
        >
          {{ sending ? 'Enviando…' : 'Enviar solicitud' }}
        </BaseButton>
      </template>
      <template v-else>
        <div class="flex flex-col items-center text-center gap-3 py-4">
          <span class="flex items-center justify-center size-12 rounded-full bg-[var(--color-status-published)]/15 text-[var(--color-status-published)]">
            <Icon name="ph:paper-plane-tilt-fill" class="size-5" />
          </span>
          <p class="text-base text-[var(--color-text)]">Solicitud enviada a {{ target?.name }}</p>
          <p class="text-sm text-[var(--color-text-muted)]">Te avisamos en cuanto responda.</p>
        </div>
      </template>
    </BottomSheet>
  </AppShell>
</template>

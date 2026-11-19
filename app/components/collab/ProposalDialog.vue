<script setup lang="ts">
import type { DiscoveryResult } from '~/composables/useDiscover'
import { formatEuros } from '~/utils/mock-data'
import { MARKETPLACE_FEE_RATE, platformFeeCents } from '~/utils/fees'
import { responseLabel } from '~/utils/discover-view'
import { buildDeliverablesSummary, USAGE_OPTIONS, type UsageOption } from '~/utils/proposal'
import { sanitizeProposalTemplate, type ProposalTemplateData } from '~/utils/proposal-templates'

/**
 * «Proponer» de un creador a una marca (Descubrir). Tarifa con deslizador sobre el rango habitual de la marca,
 * entregables por tipo, uso del contenido por la marca, mensaje opcional y un resumen de lo que cobrará el
 * creador (con la comisión real de la plataforma).
 *
 * Los entregables y el uso se guardan en los campos que ya tiene la colaboración (`scope_notes`,
 * `usage_rights`): quedan fijados al enviar, como el resto de condiciones (un trigger lo garantiza).
 */
const props = defineProps<{ target: DiscoveryResult | null }>()
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ sent: [] }>()

const client = useSupabaseClient()
const { creator } = useMyCreator()

const stage = ref<'form' | 'sent'>('form')
const sending = ref(false)
const error = ref('')

const rateEuros = ref<number | null>(null)
const reels = ref(1)
const posts = ref(0)
const stories = ref(0)
const usage = ref<UsageOption>('none')
const message = ref('')
const campaignName = ref('')
const binding = ref(false)

// Detalles opcionales (las condiciones que ya existían en la propuesta).
const termsOpen = ref(false)
const campaignGoal = ref('')
const targetAudience = ref('')
const tone = ref('')
const revisionsIncluded = ref<number | null>(null)
const exclusivity = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  stage.value = 'form'
  error.value = ''
  rateEuros.value = null
  reels.value = 1; posts.value = 0; stories.value = 0
  usage.value = 'none'
  message.value = ''
  campaignName.value = ''
  binding.value = false
  termsOpen.value = false
  campaignGoal.value = ''; targetAudience.value = ''; tone.value = ''
  revisionsIncluded.value = null
  exclusivity.value = false
})

// Plantillas: lo que se repite de una propuesta a otra (no la casilla de compromiso, que se marca cada vez).
const templateData = computed<ProposalTemplateData>(() => ({
  rateEuros: rateEuros.value || null, reels: reels.value, posts: posts.value, stories: stories.value, usage: usage.value, message: message.value,
  campaignGoal: campaignGoal.value, targetAudience: targetAudience.value, tone: tone.value, revisionsIncluded: revisionsIncluded.value, exclusivity: exclusivity.value
}))
function applyTemplate(raw: unknown) {
  const t = sanitizeProposalTemplate(raw)
  rateEuros.value = t.rateEuros
  reels.value = t.reels; posts.value = t.posts; stories.value = t.stories
  usage.value = t.usage
  message.value = t.message
  campaignGoal.value = t.campaignGoal; targetAudience.value = t.targetAudience; tone.value = t.tone
  revisionsIncluded.value = t.revisionsIncluded
  exclusivity.value = t.exclusivity
  termsOpen.value = !!(t.campaignGoal || t.targetAudience || t.tone || t.revisionsIncluded !== null || t.exclusivity)
}

const loEuros = computed(() => (props.target?.minCents ? Math.round(props.target.minCents / 100) : null))
const hiEuros = computed(() => (props.target?.maxCents ? Math.round(props.target.maxCents / 100) : null))
const hasRange = computed(() => loEuros.value != null && hiEuros.value != null && hiEuros.value > loEuros.value)
const rangeLabel = computed(() => {
  const { minCents, maxCents } = props.target ?? { minCents: null, maxCents: null }
  if (!minCents && !maxCents) return 'Sin rango indicado'
  return `${minCents ? formatEuros(minCents) : '…'} – ${maxCents ? formatEuros(maxCents) : '…'}`
})
const sliderMin = computed(() => Math.max(0, Math.floor((loEuros.value ?? 0) * 0.5 / 10) * 10))
const sliderMax = computed(() => Math.ceil(((hiEuros.value ?? loEuros.value ?? 1000) * 1.5) / 10) * 10)
const rangeHint = computed(() => {
  const r = rateEuros.value
  if (!r || !hasRange.value) return hasRange.value ? 'Elige tu tarifa' : ''
  if (r < loEuros.value!) return 'Por debajo de su rango habitual'
  if (r > hiEuros.value!) return 'Por encima de su rango habitual'
  return 'Estás dentro de su rango'
})

const rateCents = computed(() => Math.round((rateEuros.value ?? 0) * 100))
const { paymentsEnabled } = useLaunchMode()
const feeCents = computed(() => platformFeeCents(rateCents.value))
const netCents = computed(() => rateCents.value - feeCents.value)
const feePct = Math.round(MARKETPLACE_FEE_RATE * 100)
const responds = computed(() => responseLabel(props.target?.responseHours ?? null))

const totalDeliverables = computed(() => reels.value + posts.value + stories.value)
const canSend = computed(() => !!rateEuros.value && rateEuros.value > 0 && totalDeliverables.value > 0 && binding.value && !sending.value)

const bump = (r: typeof reels, d: number) => { r.value = Math.max(0, Math.min(20, r.value + d)) }
const deliverableRows = [
  { key: 'reels', label: 'Reels / vídeos', model: reels },
  { key: 'posts', label: 'Posts', model: posts },
  { key: 'stories', label: 'Stories', model: stories }
]

async function send() {
  if (!props.target || !canSend.value) return
  const me = creator.value
  if (!me) return
  const deliverables = buildDeliverablesSummary({ reels: reels.value, posts: posts.value, stories: stories.value })
  const usageOption = USAGE_OPTIONS.find((o) => o.value === usage.value)!

  sending.value = true
  error.value = ''
  const { error: insertError } = await client.from('collaborations').insert({
    partner_id: props.target.id,
    creator_id: me.id,
    initiated_by: 'creator',
    // El mensaje es opcional: sin él, la propuesta se resume sola (el campo `brief` no admite vacío).
    campaign_name: campaignName.value.trim() || null,
    brief: message.value.trim() || `Propuesta: ${deliverables}.`,
    budget_cents: rateCents.value,
    scope_notes: deliverables,
    usage_rights: usageOption.text,
    campaign_goal: campaignGoal.value.trim() || null,
    target_audience: targetAudience.value.trim() || null,
    tone: tone.value.trim() || null,
    revisions_included: revisionsIncluded.value,
    exclusivity: exclusivity.value
  } as never)
  sending.value = false

  if (insertError) {
    console.error('[proponer] fallo al enviar la propuesta:', insertError.message)
    error.value = 'No se ha podido enviar la propuesta. Inténtalo de nuevo.'
    return
  }
  stage.value = 'sent'
  emit('sent')
}
</script>

<template>
  <BottomSheet v-model="open" wide :title="target ? `Proponer a ${target.name}` : 'Proponer colaboración'">
    <div v-if="stage === 'form' && target" class="proposal">
      <div class="proposal__form">
        <p class="proposal__sub">{{ target.categories.slice(0, 2).join(' · ') }}{{ target.categories.length ? ' · ' : '' }}Rango habitual {{ rangeLabel }}</p>
        <ProposalTemplateBar kind="proposal" :current="{ ...templateData }" @apply="applyTemplate" />

        <div class="proposal__rate">
          <div class="proposal__field">
            <label for="proposal-rate" class="proposal__label">Tu tarifa (€)</label>
            <input id="proposal-rate" v-model.number="rateEuros" type="number" min="1" step="10" inputmode="numeric" class="proposal__rate-input" placeholder="350">
          </div>
          <Icon name="ph:arrow-right-bold" class="proposal__arrow" aria-hidden="true" />
          <div class="proposal__field">
            <span class="proposal__label">Rango de la marca</span>
            <span class="proposal__range">{{ rangeLabel }}</span>
          </div>
        </div>
        <template v-if="hasRange">
          <input
            v-model.number="rateEuros" type="range" class="proposal__slider" aria-label="Ajustar tarifa"
            :min="sliderMin" :max="sliderMax" step="10"
          >
          <div class="proposal__slider-legend"><span>{{ formatEuros(loEuros! * 100) }}</span><span>{{ rangeHint }}</span><span>{{ formatEuros(hiEuros! * 100) }}</span></div>
        </template>

        <h3 class="proposal__h">Entregables</h3>
        <div class="proposal__counters">
          <div v-for="row in deliverableRows" :key="row.key" class="proposal__counter">
            <span class="proposal__counter-label">{{ row.label }}</span>
            <div class="proposal__stepper">
              <button type="button" :aria-label="`Quitar uno de ${row.label}`" :disabled="row.model.value === 0" @click="bump(row.model, -1)"><Icon name="ph:minus-bold" class="size-3.5" /></button>
              <output :aria-label="row.label">{{ row.model.value }}</output>
              <button type="button" class="is-plus" :aria-label="`Añadir uno de ${row.label}`" @click="bump(row.model, 1)"><Icon name="ph:plus-bold" class="size-3.5" /></button>
            </div>
          </div>
        </div>
        <p v-if="!totalDeliverables" class="proposal__warn" role="status">Añade al menos un entregable.</p>

        <h3 class="proposal__h">Uso del contenido por la marca</h3>
        <div class="proposal__chips" role="radiogroup" aria-label="Uso del contenido por la marca">
          <button
            v-for="o in USAGE_OPTIONS" :key="o.value" type="button" role="radio" :aria-checked="usage === o.value"
            class="proposal__chip" :class="usage === o.value && 'is-on'" @click="usage = o.value"
          >{{ o.label }}</button>
        </div>

        <h3 class="proposal__h">Nombre de la campaña <span class="proposal__opt">(opcional)</span></h3>
        <input v-model="campaignName" maxlength="80" placeholder="Ej.: Reseña de producto" class="input w-full h-11" aria-label="Nombre de la campaña">

        <h3 class="proposal__h">Mensaje <span class="proposal__opt">(opcional)</span></h3>
        <textarea v-model="message" rows="3" maxlength="1000" placeholder="Cuéntales qué puedes hacer por ellos y en qué formato…" class="textarea w-full resize-none" aria-label="Mensaje" />
        <p class="proposal__count">{{ message.length }} / 1.000</p>

        <button type="button" class="proposal__more" :aria-expanded="termsOpen" @click="termsOpen = !termsOpen">
          <Icon :name="termsOpen ? 'ph:caret-down-bold' : 'ph:caret-right-bold'" class="size-3.5" />
          Más condiciones (opcional)
        </button>
        <div v-if="termsOpen" class="proposal__terms">
          <BaseField label="Objetivo de la campaña" v-slot="f"><BaseInput v-bind="f" v-model="campaignGoal" placeholder="Qué buscáis conseguir…" /></BaseField>
          <BaseField label="Público objetivo" v-slot="f"><BaseInput v-bind="f" v-model="targetAudience" placeholder="Ej. mujeres 25-35, moda sostenible" /></BaseField>
          <BaseField label="Tono" v-slot="f"><BaseInput v-bind="f" v-model="tone" placeholder="Ej. cercano y divertido" /></BaseField>
          <BaseField label="Revisiones incluidas" v-slot="f"><BaseInput v-bind="f" v-model="revisionsIncluded" type="number" min="0" step="1" placeholder="En blanco si no hay límite" /></BaseField>
          <label class="proposal__check"><input v-model="exclusivity" type="checkbox"> Exclusividad (no trabajarán con la competencia mientras dure)</label>
          <p class="proposal__fine">Quedan fijadas tal cual al enviar — no se pueden editar después.</p>
        </div>
      </div>

      <aside class="proposal__summary" aria-label="Resumen de la propuesta">
        <h3 class="proposal__summary-title">Resumen de la propuesta</h3>
        <dl class="proposal__lines">
          <div><dt>Tarifa</dt><dd>{{ rateEuros ? formatEuros(rateCents) : '—' }}</dd></div>
          <div v-if="paymentsEnabled"><dt>Comisión plataforma ({{ feePct }} %)</dt><dd>{{ rateEuros ? `− ${formatEuros(feeCents)}` : '—' }}</dd></div>
          <div class="proposal__net"><dt>Recibirás</dt><dd>{{ rateEuros ? formatEuros(paymentsEnabled ? netCents : rateCents) : '—' }}</dd></div>
        </dl>
        <p class="proposal__note">{{ paymentsEnabled ? 'Si acepta, cobras desde CIBERAN: el dinero llega directo, descontando la comisión de la plataforma.' : 'Durante el lanzamiento CIBERAN es gratis: sin comisión. El cobro lo acordáis entre vosotros.' }}</p>
        <ul class="proposal__facts">
          <li v-if="totalDeliverables"><Icon name="ph:check-bold" class="size-4" />{{ buildDeliverablesSummary({ reels, posts, stories }) }}</li>
          <li v-if="responds"><Icon name="ph:clock" class="size-4" />Responden en {{ responds }} de media</li>
        </ul>
        <label class="proposal__binding">
          <input v-model="binding" type="checkbox">
          <span>Entiendo que la propuesta es vinculante: si la marca acepta mi tarifa, me comprometo a los entregables indicados.</span>
        </label>
      </aside>

      <footer class="proposal__foot">
        <p v-if="error" class="proposal__error" role="alert">{{ error }}</p>
        <button type="button" class="proposal__cancel" @click="open = false">Cancelar</button>
        <BaseButton variant="primary" size="lg" :loading="sending" :disabled="!canSend" @click="send">Enviar propuesta</BaseButton>
      </footer>
    </div>

    <div v-else-if="stage === 'sent'" class="flex flex-col items-center text-center gap-3 py-6">
      <span class="flex items-center justify-center size-12 rounded-full bg-[var(--color-status-published)]/15 text-[var(--color-status-published)]">
        <Icon name="ph:paper-plane-tilt-fill" class="size-5" />
      </span>
      <p class="text-base text-[var(--color-text)]">Propuesta enviada a {{ target?.name }}</p>
      <p class="text-sm text-[var(--color-text-muted)]">Te avisamos en cuanto responda.</p>
      <BaseButton variant="secondary" @click="open = false">Cerrar</BaseButton>
    </div>
  </BottomSheet>
</template>

<script setup lang="ts">
import { formatCompactNumber } from '~/utils/mock-data'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { localPhotos } from '~/utils/images'
import type { Influencer, Manager } from '~/types'

useHead({ title: 'Descubrir' })

const banner = localPhotos.discover

const client = useSupabaseClient()
const { brandClient } = useMyBrandClient()

interface InfluencerRow { id: string; display_name: string; niche: string | null; manager_id: string | null; managers: { agency_name: string } | null }
interface ManagerRow { id: string; agency_name: string; focus: string | null }

const influencers = ref<Influencer[]>([])
const managers = ref<Manager[]>([])
const rosterCountByManagerId = ref<Record<string, number>>({})

async function loadDirectory() {
  const [{ data: influencerRows, error: influencerError }, { data: managerRows, error: managerError }] = await Promise.all([
    client.from('influencers').select('id, display_name, niche, manager_id, managers(agency_name)'),
    client.from('managers').select('id, agency_name, focus')
  ])
  if (influencerError) console.error('[discover] fallo al cargar influencers:', influencerError.message)
  if (managerError) console.error('[discover] fallo al cargar managers:', managerError.message)

  const rows = (influencerRows ?? []) as InfluencerRow[]
  influencers.value = rows.map((r) => ({
    id: r.id,
    name: r.display_name,
    niche: r.niche ?? 'Sin especificar',
    initials: initialsFromName(r.display_name),
    hue: hueFromString(r.display_name),
    // El nº de seguidores real llega con la sincronización de redes (Fase 4);
    // hasta entonces, 0 es honesto — no inventamos una cifra.
    weeklyTarget: 0,
    followers: 0,
    managerId: r.manager_id
  }))

  const counts: Record<string, number> = {}
  for (const r of rows) if (r.manager_id) counts[r.manager_id] = (counts[r.manager_id] ?? 0) + 1
  rosterCountByManagerId.value = counts

  managers.value = ((managerRows ?? []) as ManagerRow[]).map((m) => ({
    id: m.id,
    name: m.agency_name,
    focus: m.focus ?? 'Sin especificar',
    initials: initialsFromName(m.agency_name),
    hue: hueFromString(m.agency_name)
  }))
}

await loadDirectory()

function managerOf(influencer: Influencer) {
  return managers.value.find((m) => m.id === influencer.managerId)
}
function rosterCountOf(manager: Manager) {
  return rosterCountByManagerId.value[manager.id] ?? 0
}

const sheetOpen = ref(false)
const sheetStage = ref<'form' | 'sent'>('form')
const target = ref<{ kind: 'influencer' | 'manager'; id: string; name: string } | null>(null)
const message = ref('')
const budgetEuros = ref<number | null>(null)
const sending = ref(false)

function openContact(kind: 'influencer' | 'manager', id: string, name: string) {
  target.value = { kind, id, name }
  sheetStage.value = 'form'
  message.value = ''
  budgetEuros.value = null
  sheetOpen.value = true
}

async function send() {
  if (!target.value || !message.value || !budgetEuros.value) return
  const me = brandClient.value
  if (!me) return

  sending.value = true
  const { error } = await client.from('collaborations').insert({
    brand_client_id: me.id,
    influencer_id: target.value.kind === 'influencer' ? target.value.id : null,
    manager_id: target.value.kind === 'manager' ? target.value.id : null,
    brief: message.value,
    budget_cents: Math.round(budgetEuros.value * 100)
  } as never)
  sending.value = false

  if (error) {
    console.error('[discover] fallo al enviar la solicitud:', error.message)
    return
  }
  sheetStage.value = 'sent'
}
</script>

<template>
  <AppShell role="client" title="Descubrir" subtitle="Contacta directo con un influencer o con su agencia">
    <div class="relative h-36 md:h-48 rounded-[var(--radius-lg)] overflow-hidden mb-7">
      <CoverImage :photo="banner" :width="900" :height="400" scrim="bottom" class="absolute inset-0" />
      <div class="relative h-full flex flex-col justify-end p-5">
        <p class="font-display text-white text-[1.375rem] leading-snug max-w-[26ch]">Encuentra tu próxima colaboración</p>
      </div>
    </div>

    <section class="mb-8">
      <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-1">Influencers</h2>
      <p class="text-[0.8125rem] text-[var(--color-text-muted)] mb-3.5">Algunos trabajan solos, otros a través de una agencia — tú eliges a quién escribir.</p>
      <EmptyState
        v-if="!influencers.length"
        icon="ph:user-circle" title="Todavía no hay influencers"
        description="En cuanto se unan a FEEDMA, aparecerán aquí para que puedas contactarlos."
      />
      <div v-else class="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
        <BaseCard v-for="influencer in influencers" :key="influencer.id" radius="md" padding="md" class="flex items-center gap-4">
          <BaseAvatar :initials="influencer.initials" :hue="influencer.hue" />
          <div class="min-w-0 flex-1">
            <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ influencer.name }}</p>
            <p class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">
              {{ influencer.niche }} · {{ formatCompactNumber(influencer.followers) }} seguidores
            </p>
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">
              {{ managerOf(influencer) ? `Representado por ${managerOf(influencer)!.name}` : 'Independiente' }}
            </p>
          </div>
          <BaseButton variant="secondary" size="sm" class="shrink-0" @click="openContact('influencer', influencer.id, influencer.name)">Contactar</BaseButton>
        </BaseCard>
      </div>
    </section>

    <section>
      <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-1">Agencias</h2>
      <p class="text-[0.8125rem] text-[var(--color-text-muted)] mb-3.5">Cuéntales tu campaña y ellos asignan el influencer de su roster que mejor encaje.</p>
      <EmptyState
        v-if="!managers.length"
        icon="ph:briefcase" title="Todavía no hay agencias"
        description="En cuanto se unan a FEEDMA, aparecerán aquí para que puedas contactarlas."
      />
      <div v-else class="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
        <BaseCard v-for="manager in managers" :key="manager.id" radius="md" padding="md" class="flex items-center gap-4">
          <BaseAvatar :initials="manager.initials" :hue="manager.hue" />
          <div class="min-w-0 flex-1">
            <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ manager.name }}</p>
            <p class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">{{ manager.focus }}</p>
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">{{ rosterCountOf(manager) }} influencers en su roster</p>
          </div>
          <BaseButton variant="secondary" size="sm" class="shrink-0" @click="openContact('manager', manager.id, manager.name)">Contactar</BaseButton>
        </BaseCard>
      </div>
    </section>

    <BottomSheet v-model="sheetOpen" :title="target ? `Contactar a ${target.name}` : 'Contactar'">
      <template v-if="sheetStage === 'form'">
        <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="brief">Cuéntales tu campaña</label>
        <textarea
          id="brief" v-model="message" rows="4" placeholder="Qué necesitas y para cuándo…"
          class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
        />

        <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5 mt-4" for="budget">Presupuesto (€)</label>
        <input
          id="budget" v-model.number="budgetEuros" type="number" min="1" step="1" placeholder="Ej. 300"
          class="w-full h-11 px-3.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60"
        >
        <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-1.5">Lo pagas desde FEEDMA cuando acordéis los detalles — el dinero llega directo, descontando la comisión de la plataforma.</p>

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
          <p class="text-[0.9375rem] text-[var(--color-text)]">Solicitud enviada a {{ target?.name }}</p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)]">Te avisamos en cuanto responda.</p>
        </div>
      </template>
    </BottomSheet>
  </AppShell>
</template>

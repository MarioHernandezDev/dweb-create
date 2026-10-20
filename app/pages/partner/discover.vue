<script setup lang="ts">
import { formatCompactNumber } from '~/utils/mock-data'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { localPhotos } from '~/utils/images'
import type { Creator } from '~/types'

useHead({ title: 'Descubrir' })

const banner = localPhotos.discover

const client = useSupabaseClient()
const { partner } = useMyPartner()

interface CreatorRow { id: string; display_name: string; niche: string | null }

const creators = ref<Creator[]>([])

async function loadDirectory() {
  const { data, error } = await client.from('creators').select('id, display_name, niche')
  if (error) console.error('[discover] fallo al cargar creadores:', error.message)

  const rows = (data ?? []) as CreatorRow[]
  creators.value = rows.map((r) => ({
    id: r.id,
    name: r.display_name,
    niche: r.niche ?? 'Sin especificar',
    initials: initialsFromName(r.display_name),
    hue: hueFromString(r.display_name),
    // El nº de seguidores real llega con la sincronización de redes (Fase 4);
    // hasta entonces, 0 es honesto — no inventamos una cifra.
    weeklyTarget: 0,
    followers: 0
  }))
}

await loadDirectory()

const sheetOpen = ref(false)
const sheetStage = ref<'form' | 'sent'>('form')
const target = ref<{ id: string; name: string } | null>(null)
const message = ref('')
const budgetEuros = ref<number | null>(null)
const sending = ref(false)

function openContact(id: string, name: string) {
  target.value = { id, name }
  sheetStage.value = 'form'
  message.value = ''
  budgetEuros.value = null
  sheetOpen.value = true
}

async function send() {
  if (!target.value || !message.value || !budgetEuros.value) return
  const me = partner.value
  if (!me) return

  sending.value = true
  const { error } = await client.from('collaborations').insert({
    partner_id: me.id,
    creator_id: target.value.id,
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
  <AppShell role="partner" title="Descubrir" subtitle="Contacta directo con un creador de contenido">
    <div class="relative h-36 md:h-48 rounded-[var(--radius-lg)] overflow-hidden mb-7">
      <CoverImage :photo="banner" :width="900" :height="400" scrim="bottom" class="absolute inset-0" />
      <div class="relative h-full flex flex-col justify-end p-5">
        <p class="font-display text-white text-[1.375rem] leading-snug max-w-[26ch]">Encuentra tu próxima colaboración</p>
      </div>
    </div>

    <section>
      <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-1">Creadores de contenido</h2>
      <p class="text-[0.8125rem] text-[var(--color-text-muted)] mb-3.5">Contacta directo con quien quieras trabajar.</p>
      <EmptyState
        v-if="!creators.length"
        icon="ph:user-circle" title="Todavía no hay creadores"
        description="En cuanto se unan a FEEDMA, aparecerán aquí para que puedas contactarlos."
      />
      <div v-else class="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
        <BaseCard v-for="creator in creators" :key="creator.id" radius="md" padding="md" class="flex items-center gap-4">
          <BaseAvatar :initials="creator.initials" :hue="creator.hue" />
          <div class="min-w-0 flex-1">
            <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ creator.name }}</p>
            <p class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">
              {{ creator.niche }} · {{ formatCompactNumber(creator.followers) }} seguidores
            </p>
          </div>
          <BaseButton variant="secondary" size="sm" class="shrink-0" @click="openContact(creator.id, creator.name)">Contactar</BaseButton>
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

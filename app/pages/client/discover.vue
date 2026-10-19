<script setup lang="ts">
import { influencers, managers, formatCompactNumber } from '~/utils/mock-data'
import type { Influencer, Manager } from '~/types'

useHead({ title: 'Descubrir' })

function managerOf(influencer: Influencer) {
  return managers.find((m) => m.id === influencer.managerId)
}
function rosterOf(manager: Manager) {
  return influencers.filter((i) => i.managerId === manager.id)
}

const sheetOpen = ref(false)
const sheetStage = ref<'form' | 'sent'>('form')
const target = ref<{ kind: 'influencer' | 'manager'; name: string } | null>(null)
const message = ref('')

function openContact(kind: 'influencer' | 'manager', name: string) {
  target.value = { kind, name }
  sheetStage.value = 'form'
  message.value = ''
  sheetOpen.value = true
}

function send() {
  sheetStage.value = 'sent'
}
</script>

<template>
  <AppShell role="client" title="Descubrir" subtitle="Contacta directo con un influencer o con su agencia">
    <section class="mb-8">
      <h2 class="font-display text-[1.25rem] text-[var(--color-text)] mb-1">Influencers</h2>
      <p class="text-[0.8125rem] text-[var(--color-text-muted)] mb-3.5">Algunos trabajan solos, otros a través de una agencia — tú eliges a quién escribir.</p>
      <EmptyState
        v-if="!influencers.length"
        icon="ph:user-circle" title="Todavía no hay influencers"
        description="En cuanto se unan a FEEDMA, aparecerán aquí para que puedas contactarlos."
      />
      <div v-else class="flex flex-col gap-2.5">
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
          <BaseButton variant="secondary" size="sm" class="shrink-0" @click="openContact('influencer', influencer.name)">Contactar</BaseButton>
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
      <div v-else class="flex flex-col gap-2.5">
        <BaseCard v-for="manager in managers" :key="manager.id" radius="md" padding="md" class="flex items-center gap-4">
          <BaseAvatar :initials="manager.initials" :hue="manager.hue" />
          <div class="min-w-0 flex-1">
            <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ manager.name }}</p>
            <p class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">{{ manager.focus }}</p>
            <p class="text-[0.75rem] text-[var(--color-text-faint)] mt-0.5">{{ rosterOf(manager).length }} influencers en su roster</p>
          </div>
          <BaseButton variant="secondary" size="sm" class="shrink-0" @click="openContact('manager', manager.name)">Contactar</BaseButton>
        </BaseCard>
      </div>
    </section>

    <BottomSheet v-model="sheetOpen" :title="target ? `Contactar a ${target.name}` : 'Contactar'">
      <template v-if="sheetStage === 'form'">
        <label class="block text-[0.8125rem] font-medium text-[var(--color-text-muted)] mb-1.5" for="brief">Cuéntales tu campaña</label>
        <textarea
          id="brief" v-model="message" rows="4" placeholder="Qué necesitas, para cuándo, y qué presupuesto manejas…"
          class="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.9375rem] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary-500)]/60 resize-none"
        />
        <BaseButton variant="primary" size="lg" class="w-full mt-4" :disabled="!message" @click="send">Enviar solicitud</BaseButton>
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

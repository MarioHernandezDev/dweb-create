<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'
import { localPhotos } from '~/utils/images'
import { rosterRequestStatusMeta } from '~/utils/status'
import type { Manager } from '~/types'

useHead({ title: 'Descubrir agencias' })

const banner = localPhotos.discover

const client = useSupabaseClient()
const { influencer } = useMyInfluencer()
const { requests, sending, ensureLoaded, sendRequest } = useRosterRequests()

interface ManagerRow { id: string; agency_name: string; focus: string | null }

const managers = ref<Manager[]>([])

async function loadDirectory() {
  const { data, error } = await client.from('managers').select('id, agency_name, focus')
  if (error) {
    console.error('[creator/discover] fallo al cargar agencias:', error.message)
    return
  }
  managers.value = ((data ?? []) as ManagerRow[]).map((m) => ({
    id: m.id,
    name: m.agency_name,
    focus: m.focus ?? 'Sin especificar',
    initials: initialsFromName(m.agency_name),
    hue: hueFromString(m.agency_name)
  }))
}

await Promise.all([loadDirectory(), ensureLoaded()])

function requestFor(managerId: string) {
  return requests.value.find((r) => r.managerId === managerId) ?? null
}

async function request(managerId: string) {
  try {
    await sendRequest(managerId)
  } catch (err) {
    console.error('[creator/discover] fallo al enviar la solicitud:', err)
  }
}
</script>

<template>
  <AppShell role="creator" title="Descubrir agencias" subtitle="Pide unirte al roster de un manager">
    <div class="relative h-36 md:h-48 rounded-[var(--radius-lg)] overflow-hidden mb-7">
      <CoverImage :photo="banner" :width="900" :height="400" scrim="bottom" class="absolute inset-0" />
      <div class="relative h-full flex flex-col justify-end p-5">
        <p class="font-display text-white text-[1.375rem] leading-snug max-w-[26ch]">Que una agencia reparta el trabajo por ti</p>
      </div>
    </div>

    <BaseCard v-if="influencer?.managerName" radius="md" padding="md" class="mb-6 flex items-center gap-3">
      <Icon name="ph:info-fill" class="size-5 text-[var(--color-text-muted)] shrink-0" />
      <p class="text-[0.875rem] text-[var(--color-text)]">
        Ya te representa <strong class="font-medium">{{ influencer.managerName }}</strong>. Si pides unirte a otra agencia y te acepta, cambiará quién gestiona tu trabajo.
      </p>
    </BaseCard>

    <EmptyState
      v-if="!managers.length"
      icon="ph:briefcase" title="Todavía no hay agencias"
      description="En cuanto se unan a FEEDMA, aparecerán aquí para que puedas pedir unirte."
    />
    <div v-else class="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
      <BaseCard v-for="m in managers" :key="m.id" radius="md" padding="md" class="flex items-center gap-4">
        <BaseAvatar :initials="m.initials" :hue="m.hue" />
        <div class="min-w-0 flex-1">
          <p class="text-[0.9375rem] font-medium text-[var(--color-text)] truncate">{{ m.name }}</p>
          <p class="text-[0.8125rem] text-[var(--color-text-muted)] truncate">{{ m.focus }}</p>
        </div>
        <BaseButton
          v-if="!requestFor(m.id) || requestFor(m.id)!.status === 'declined'"
          variant="secondary" size="sm" class="shrink-0" :icon-spin="sending === m.id" :disabled="sending === m.id"
          @click="request(m.id)"
        >
          Pedir unirme
        </BaseButton>
        <span v-else class="shrink-0 text-[0.8125rem]" :style="{ color: rosterRequestStatusMeta[requestFor(m.id)!.status].color }">
          {{ rosterRequestStatusMeta[requestFor(m.id)!.status].label }}
        </span>
      </BaseCard>
    </div>
  </AppShell>
</template>

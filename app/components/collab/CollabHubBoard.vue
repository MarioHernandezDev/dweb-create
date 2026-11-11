<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { visiblePhases, type CollabPhase } from '~/utils/collab-phase'
import { PLATFORM_SHORT } from '~/utils/discover-view'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { HubItem } from '~/composables/useCollabHub'

/** Tablero por fases de las colaboraciones activas. Las tarjetas son enlaces: la fase avanza sola, no se arrastra. */
const props = defineProps<{
  items: HubItem[]
  role: 'creator' | 'partner'
  progressFor: (id: string) => { done: number; total: number } | null
  hintOf: (c: HubItem) => { text: string; tone: 'action' | 'waiting' } | null
}>()

// Sin cobros activos no hay columna «Pagada», salvo que ya exista alguna colaboración pagada que enseñar.
const { paymentsEnabled } = useLaunchMode()
const phases = computed(() => visiblePhases(paymentsEnabled || props.items.some((i) => i.phase === 'paid')))
const short = (p: string) => PLATFORM_SHORT[p] ?? p
const byPhase = (items: HubItem[], phase: CollabPhase) => items.filter((i) => i.phase === phase)
const dueLabel = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '') : null)
</script>

<template>
  <div class="hboard" role="list">
    <section v-for="ph in phases" :key="ph.value" class="hboard__col" :data-phase="ph.value" role="listitem" :aria-label="ph.label">
      <header class="hboard__head"><h3>{{ ph.label }}</h3><span>{{ byPhase(items, ph.value).length }}</span></header>
      <div class="hboard__cards">
        <NuxtLink
          v-for="c in byPhase(items, ph.value)" :key="c.id" :to="`/${role}/collaborations/${c.id}`" class="hcard"
          :data-attention="hintOf(c)?.tone === 'action' ? 'true' : undefined"
        >
          <span v-if="c.payment !== 'none'" class="hcard__pay" :data-pay="c.payment">{{ c.payment === 'paid' ? 'Pagado' : 'Pago pendiente' }}</span>
          <span class="hcard__title">{{ c.title }}</span>
          <span class="hcard__meta">
            <span class="hcard__who"><BaseAvatar :initials="initialsFromName(c.counterpart)" :hue="hueFromString(c.counterpart)" size="sm" /><span>{{ c.counterpart }}</span></span>
            <span v-if="dueLabel(c.dueDate)" class="hcard__due"><Icon name="ph:calendar-blank" class="size-3.5" />{{ dueLabel(c.dueDate) }}</span>
          </span>
          <span class="hcard__brief">{{ c.brief }}</span>
          <span v-if="progressFor(c.id) || c.posts.length" class="hcard__progress">
            <span class="hcard__bar"><span :style="{ width: `${(progressFor(c.id) ? progressFor(c.id)!.done / progressFor(c.id)!.total : c.posts.filter((p) => p.status === 'published').length / c.posts.length) * 100}%` }" /></span>
            <span>{{ progressFor(c.id) ? `${progressFor(c.id)!.done}/${progressFor(c.id)!.total}` : `${c.posts.filter((p) => p.status === 'published').length}/${c.posts.length}` }}</span>
          </span>
          <span class="hcard__foot">
            <span v-if="hintOf(c)" class="hcard__hint" :data-tone="hintOf(c)!.tone">{{ hintOf(c)!.text }}</span>
            <span class="hcard__price">{{ c.platforms.map(short).join(' · ') }}<template v-if="c.platforms.length && c.budgetCents"> · </template><template v-if="c.budgetCents">{{ formatEuros(c.budgetCents) }}</template></span>
          </span>
        </NuxtLink>
        <p v-if="!byPhase(items, ph.value).length" class="hboard__empty">Sin colaboraciones</p>
      </div>
    </section>
  </div>
</template>

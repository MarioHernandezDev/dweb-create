<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { formatMoney } from '~/utils/money'
import { COLLAB_PHASES, readyPostCount, type CollabPhase } from '~/utils/collab-phase'
import { PLATFORM_SHORT } from '~/utils/discover-view'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { HubItem } from '~/composables/useCollabHub'

/** Lista agrupada por fase (colapsable). Las fases «Publicada» y «Pagada» empiezan plegadas, como en el diseño. */
const props = defineProps<{
  items: HubItem[]
  role: 'creator' | 'partner'
  progressFor: (id: string) => { done: number; total: number } | null
  payLabel: string
}>()

const { paymentsEnabled } = useLaunchMode()
const closed = reactive<Record<string, boolean>>({ published: true, paid: true })
const groups = computed(() => COLLAB_PHASES
  .map((ph) => {
    const list = props.items.filter((i) => i.phase === ph.value)
    return { ...ph, list, total: list.reduce((s, i) => s + (i.budgetCents ?? 0), 0) }
  })
  .filter((g) => g.list.length))
const dueLabel = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '') : '—')
const pct = (c: HubItem) => {
  const p = props.progressFor(c.id)
  const done = p ? p.done : readyPostCount(c.posts)
  const total = p ? p.total : c.posts.length
  return { done, total, w: total ? (done / total) * 100 : 0 }
}
function toggle(phase: CollabPhase) { closed[phase] = !closed[phase] }
</script>

<template>
  <div class="hlist">
    <div class="hlist__cols" aria-hidden="true">
      <span>Colaboración</span><span>Formato</span><span>Entregables</span><span>Entrega</span><span>{{ paymentsEnabled ? payLabel : '' }}</span><span class="hlist__r">Importe</span>
    </div>
    <section v-for="g in groups" :key="g.value" class="hlist__group" :data-phase="g.value">
      <button type="button" class="hlist__head" :aria-expanded="!closed[g.value]" @click="toggle(g.value)">
        <Icon name="ph:caret-down-bold" class="size-3.5 hlist__caret" :class="closed[g.value] && 'is-closed'" />
        <span class="hlist__name">{{ g.label }}</span><span class="hub__count">{{ g.list.length }}</span>
        <span class="hlist__sum">{{ formatMoney(g.total) }}</span>
      </button>
      <ul v-if="!closed[g.value]" class="hlist__rows">
        <li v-for="c in g.list" :key="c.id">
          <NuxtLink :to="`/${role}/collaborations/${c.id}`" class="hlist__row">
            <span class="hlist__main">
              <BaseAvatar :initials="initialsFromName(c.counterpart)" :hue="hueFromString(c.counterpart)" size="sm" />
              <span class="hlist__text"><strong>{{ c.title }}</strong><small>{{ c.counterpart }}</small></span>
            </span>
            <span class="hlist__fmt"><span v-for="p in c.platforms" :key="p" class="dcard__platform">{{ PLATFORM_SHORT[p] ?? p }}</span><template v-if="!c.platforms.length">—</template></span>
            <span class="hlist__prog"><span class="hcard__bar"><span :style="{ width: `${pct(c).w}%` }" /></span><span>{{ pct(c).done }}/{{ pct(c).total }}</span></span>
            <span class="hlist__due">{{ dueLabel(c.dueDate) }}</span>
            <span><span v-if="c.payment !== 'none'" class="hcard__pay hcard__pay--row" :data-pay="c.payment">{{ c.payment === 'paid' ? 'Pagado' : 'Pendiente' }}</span></span>
            <span class="hlist__r hlist__amount">{{ c.budgetCents ? formatEuros(c.budgetCents) : '—' }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

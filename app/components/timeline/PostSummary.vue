<script setup lang="ts">
import type { Post, PostStatus } from '~/types'
import { statusMeta } from '~/utils/status'
import { platformMeta } from '~/utils/mock-data'
import { PLATFORM_SHORT } from '~/utils/discover-view'
import { postsByDay, weekDays, weekRangeLabel } from '~/utils/post-calendar'

/**
 * Resumen del tablero: reparto de las publicaciones por fase (rosco) y la semana en curso con lo que vence cada día.
 * Todo sale de las publicaciones ya cargadas; no hay nada propio que guardar. Las publicaciones solo tienen fecha
 * (sin hora), así que cada día lista títulos, no horas.
 */
const props = defineProps<{ posts: Post[] }>()
const emit = defineEmits<{ open: [post: Post] }>()

const phases: PostStatus[] = ['idea', 'in_production', 'ready_for_review', 'scheduled', 'published']
const counts = computed(() => phases.map((s) => ({ status: s, label: statusMeta[s].label, color: statusMeta[s].color, n: props.posts.filter((p) => p.status === s).length })))
const total = computed(() => counts.value.reduce((sum, c) => sum + c.n, 0))

// Rosco con círculos SVG (un arco por fase, sin librería de gráficos).
const R = 36
const C = 2 * Math.PI * R
const arcs = computed(() => {
  let offset = 0
  return counts.value.filter((c) => c.n > 0).map((c) => {
    const len = (c.n / total.value) * C
    const arc = { ...c, dash: `${len} ${C - len}`, offset: -offset }
    offset += len
    return arc
  })
})

const week = computed(() => weekDays())
const byDay = computed(() => postsByDay(props.posts))
const weekCount = computed(() => week.value.reduce((sum, d) => sum + (byDay.value.get(d.iso)?.length ?? 0), 0))
</script>

<template>
  <div class="psum">
    <section class="psum__card psum__donut" aria-label="Publicaciones por fase">
      <svg viewBox="0 0 100 100" class="psum__ring" role="img" :aria-label="`${total} publicaciones en total`">
        <circle cx="50" cy="50" :r="R" fill="none" class="psum__ring-bg" stroke-width="14" />
        <circle
          v-for="a in arcs" :key="a.status" cx="50" cy="50" :r="R" fill="none" stroke-width="14" :stroke="a.color"
          :stroke-dasharray="a.dash" :stroke-dashoffset="a.offset" transform="rotate(-90 50 50)"
        />
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central" class="psum__total">{{ total }}</text>
        <text x="50" y="64" text-anchor="middle" class="psum__total-label">en total</text>
      </svg>
      <ul class="psum__legend">
        <li v-for="c in counts" :key="c.status"><span class="psum__dot" :style="{ background: c.color }" /><span>{{ c.label }}</span><strong>{{ c.n }}</strong></li>
      </ul>
    </section>

    <section class="psum__card psum__week" aria-label="Esta semana">
      <header class="psum__week-head">
        <h2>Esta semana</h2>
        <span>{{ weekRangeLabel(week) }} · {{ weekCount }} {{ weekCount === 1 ? 'entrega' : 'entregas' }}</span>
      </header>
      <div class="psum__days">
        <div v-for="d in week" :key="d.iso" class="psum__day" :class="d.isToday && 'is-today'">
          <p class="psum__day-label">{{ d.label }}<template v-if="d.isToday"> · hoy</template></p>
          <button
            v-for="p in (byDay.get(d.iso) ?? []).slice(0, 2)" :key="p.id" type="button" class="psum__item" :data-status="p.status"
            :title="`${p.title} · ${platformMeta[p.platform].label}`" @click="emit('open', p)"
          >
            <span class="psum__item-title">{{ p.title }}</span>
            <span class="psum__item-net">{{ PLATFORM_SHORT[p.platform] ?? p.platform }}</span>
          </button>
          <p v-if="(byDay.get(d.iso)?.length ?? 0) > 2" class="psum__more">+{{ (byDay.get(d.iso)?.length ?? 0) - 2 }} más</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '~/types'
import { statusMeta } from '~/utils/status'
import { PLATFORM_SHORT } from '~/utils/discover-view'
import { monthGrid, monthName, postsByDay } from '~/utils/post-calendar'

/** Calendario mensual de publicaciones por fecha de entrega. Abre la ficha rápida de la publicación al pulsarla. */
const props = defineProps<{ posts: Post[] }>()
const emit = defineEmits<{ open: [post: Post] }>()

const now = new Date()
const cursor = ref({ year: now.getFullYear(), month: now.getMonth() })
const grid = computed(() => monthGrid(cursor.value.year, cursor.value.month))
const byDay = computed(() => postsByDay(props.posts))
const title = computed(() => `${monthName(cursor.value.month)} ${cursor.value.year}`)
const dow = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function shift(delta: number) {
  const d = new Date(cursor.value.year, cursor.value.month + delta, 1)
  cursor.value = { year: d.getFullYear(), month: d.getMonth() }
}
function today() { cursor.value = { year: now.getFullYear(), month: now.getMonth() } }
const MAX = 3
</script>

<template>
  <section class="pcal" aria-label="Calendario de publicaciones">
    <header class="pcal__head">
      <h2 class="pcal__title">{{ title }}</h2>
      <div class="pcal__nav">
        <BaseButton variant="outline" size="sm" icon="ph:caret-left-bold" icon-only aria-label="Mes anterior" @click="shift(-1)" />
        <BaseButton variant="outline" size="sm" @click="today">Hoy</BaseButton>
        <BaseButton variant="outline" size="sm" icon="ph:caret-right-bold" icon-only aria-label="Mes siguiente" @click="shift(1)" />
      </div>
    </header>
    <div class="pcal__grid" role="grid">
      <div v-for="d in dow" :key="d" class="pcal__dow" role="columnheader">{{ d }}</div>
      <div v-for="day in grid" :key="day.iso" class="pcal__cell" :class="[day.isToday && 'is-today', !day.inMonth && 'is-out']" role="gridcell">
        <span class="pcal__num">{{ day.day }}</span>
        <button
          v-for="p in (byDay.get(day.iso) ?? []).slice(0, MAX)" :key="p.id" type="button" class="pcal__item" :data-status="p.status"
          :title="`${p.title} · ${statusMeta[p.status].label}`" @click="emit('open', p)"
        >
          <span class="pcal__item-net">{{ PLATFORM_SHORT[p.platform] ?? p.platform }}</span>
          <span class="pcal__item-title">{{ p.title }}</span>
        </button>
        <p v-if="(byDay.get(day.iso)?.length ?? 0) > MAX" class="pcal__more">+{{ (byDay.get(day.iso)?.length ?? 0) - MAX }} más</p>
      </div>
    </div>
    <p v-if="!posts.length" class="pcal__empty">No hay publicaciones con estos filtros.</p>
  </section>
</template>

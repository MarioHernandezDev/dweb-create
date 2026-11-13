<script setup lang="ts">
import type { Post } from '~/types'
import { statusMeta } from '~/utils/status'
import { PLATFORM_SHORT } from '~/utils/discover-view'
import { iso, monthGrid, monthName, postsByDay } from '~/utils/post-calendar'

/**
 * Calendario mensual de publicaciones por fecha de entrega. Pulsar una publicación abre su ficha rápida; arrastrarla a
 * otro día la reprograma; el «+» de un día crea una publicación con esa fecha. No se programa en el pasado (igual que
 * el campo de fecha de la ficha) y las ya publicadas no se mueven.
 */
const props = defineProps<{ posts: Post[] }>()
const emit = defineEmits<{ open: [post: Post]; reschedule: [post: Post, dueDate: string]; create: [dueDate: string] }>()

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

const todayIso = iso(now)
const canDrop = (dayIso: string) => dayIso >= todayIso
const draggingId = ref<string | null>(null)
const overDay = ref<string | null>(null)

function onDragStart(e: DragEvent, p: Post) {
  draggingId.value = p.id
  e.dataTransfer?.setData('text/plain', p.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDragEnd() { draggingId.value = null; overDay.value = null }
function onDragOver(e: DragEvent, dayIso: string) {
  if (!draggingId.value || !canDrop(dayIso)) return
  e.preventDefault() // sin esto el navegador no admite soltar aquí
  overDay.value = dayIso
}
function onDrop(e: DragEvent, dayIso: string) {
  e.preventDefault()
  const post = props.posts.find((p) => p.id === draggingId.value)
  onDragEnd()
  if (post && canDrop(dayIso) && post.dueDate.slice(0, 10) !== dayIso) emit('reschedule', post, dayIso)
}
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
      <div
        v-for="day in grid" :key="day.iso" class="pcal__cell"
        :class="[day.isToday && 'is-today', !day.inMonth && 'is-out', overDay === day.iso && 'is-drop']" role="gridcell"
        @dragover="onDragOver($event, day.iso)" @dragleave="overDay === day.iso && (overDay = null)" @drop="onDrop($event, day.iso)"
      >
        <div class="pcal__top">
          <span class="pcal__num">{{ day.day }}</span>
          <button
            v-if="canDrop(day.iso)" type="button" class="pcal__add" :aria-label="`Nueva publicación el ${day.day} de ${monthName(day.date.getMonth())}`"
            @click="emit('create', day.iso)"
          >
            <Icon name="ph:plus-bold" class="size-3" />
          </button>
        </div>
        <button
          v-for="p in (byDay.get(day.iso) ?? []).slice(0, MAX)" :key="p.id" type="button" class="pcal__item" :data-status="p.status"
          :class="draggingId === p.id && 'is-dragging'" :draggable="p.status !== 'published'"
          :title="`${p.title} · ${statusMeta[p.status].label}${p.status === 'published' ? '' : ' · arrástrala a otro día para reprogramarla'}`"
          @click="emit('open', p)" @dragstart="onDragStart($event, p)" @dragend="onDragEnd"
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

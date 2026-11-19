<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'
import type { CollabEvent } from '~/composables/useCollabEvents'

/**
 * Cronología de una colaboración. Dos tipos de línea, a propósito distintos:
 *  - cambios de estado (solicitud, aceptación, cierre…): una línea sobria con punto;
 *  - acciones y mensajes de las personas (contraofertas, peticiones de cambios,
 *    aprobaciones, apuntes): con quien los escribió y, si lo hay, su texto citado.
 * Los eventos los registra la base de datos (triggers); aquí solo se muestran.
 * Las fechas de eventos rellenados a posteriori se marcan como aproximadas.
 */
const props = defineProps<{
  events: CollabEvent[]
  myProfileId: string | null
  counterpartProfileId: string | null
  counterpartName: string
  error?: string
}>()

const filter = ref<'all' | 'people'>('all')
const filters = [
  { value: 'all', label: 'Todo' },
  { value: 'people', label: 'Mensajes y acciones' }
]

type Line = { id: string; icon: string; text: string; quote?: string; tone: 'system' | 'people'; when: string; approximate: boolean; by: string | null }

function actor(e: CollabEvent): string {
  if (!e.actorProfileId) return ''
  if (e.actorProfileId === props.myProfileId) return 'Tú'
  if (e.actorProfileId === props.counterpartProfileId) return props.counterpartName
  return 'Alguien'
}
const ver = (d: Record<string, unknown>) => (typeof d.contentVersion === 'number' ? ` (v${d.contentVersion})` : '')
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

function toLine(e: CollabEvent): Line {
  const d = e.detail
  const who = actor(e)
  const base = { id: e.id, when: relativeTime(e.createdAt), approximate: d.approximate === true, by: e.actorProfileId ? who : null }
  const title = str(d.title) ? `«${str(d.title)}»` : 'La publicación'
  const budget = typeof d.budgetCents === 'number' ? ` · ${formatEuros(d.budgetCents)}` : ''
  switch (e.kind) {
    case 'requested': return { ...base, tone: 'system', icon: 'ph:paper-plane-tilt', text: `Solicitud enviada${budget}` }
    case 'accepted': return { ...base, tone: 'system', icon: 'ph:check-circle', text: d.origin === 'chat_offer' ? `Oferta del chat aceptada${budget}` : `Solicitud aceptada${budget}` }
    case 'declined': return { ...base, tone: 'system', icon: 'ph:x-circle', text: 'Solicitud rechazada' }
    case 'completed': return { ...base, tone: 'system', icon: 'ph:flag-checkered', text: 'Colaboración completada' }
    case 'counteroffer': return { ...base, tone: 'people', icon: 'ph:arrows-left-right', text: `Nuevo presupuesto propuesto: ${formatEuros(d.budgetCents as number)}`, quote: str(d.message) }
    case 'deliverable_sent': return { ...base, tone: 'people', icon: 'ph:upload-simple', text: d.resubmission ? `Nueva versión de ${title} enviada a revisión` : `${title} enviada a revisión` }
    case 'changes_requested': return { ...base, tone: 'people', icon: 'ph:pencil-simple-line', text: `Cambios pedidos en ${title}${ver(d)}`, quote: str(d.comment) }
    case 'approved': return { ...base, tone: 'people', icon: 'ph:seal-check', text: `${title} aprobada${ver(d)}`, quote: str(d.comment) }
    case 'deliverable_published': return { ...base, tone: 'system', icon: 'ph:broadcast', text: `${title} publicada` }
    case 'rated': return { ...base, tone: 'people', icon: 'ph:star', text: 'Valoración enviada' }
    case 'note': return { ...base, tone: 'people', icon: d.logKind === 'incident' ? 'ph:warning-circle' : 'ph:handshake', text: d.logKind === 'incident' ? 'Incidencia registrada' : 'Cambio acordado registrado', quote: str(d.text) }
    case 'deliverables_defined': return { ...base, tone: 'people', icon: 'ph:list-checks', text: `Entregables definidos por la marca (${d.count ?? '?'})`, quote: Array.isArray(d.titles) ? (d.titles as string[]).join(' · ') : undefined }
    case 'deliverables_confirmed': return { ...base, tone: 'people', icon: 'ph:check-square', text: 'Entregables confirmados por el creador' }
    case 'deliverable_assigned': return { ...base, tone: 'system', icon: 'ph:link', text: `«${str(d.postTitle) ?? 'Publicación'}» asignada a «${str(d.deliverableTitle) ?? 'un entregable'}»` }
    case 'deliverable_unassigned': return { ...base, tone: 'system', icon: 'ph:link-break', text: `Publicación soltada de «${str(d.deliverableTitle) ?? 'un entregable'}»` }
    case 'approval_invalidated': return { ...base, tone: 'system', icon: 'ph:arrow-counter-clockwise', text: `Aprobación de ${title} invalidada: cambió el contenido (v${d.fromVersion} → v${d.toVersion})` }
    case 'edited_after_publish': return { ...base, tone: 'system', icon: 'ph:pencil-simple', text: `${title} editada tras publicarse (v${d.fromVersion} → v${d.toVersion})` }
    case 'deliverable_waived': return { ...base, tone: 'people', icon: 'ph:prohibit', text: `Entregable «${str(d.deliverableTitle) ?? ''}» renunciado`, quote: str(d.reason) }
    case 'deliverable_accepted_without_approval': return { ...base, tone: 'people', icon: 'ph:seal-warning', text: `«${str(d.deliverableTitle) ?? ''}» aceptado sin aprobación formal (v${d.contentVersion ?? '?'})`, quote: str(d.reason) }
    case 'deliverable_reopened': return { ...base, tone: 'people', icon: 'ph:arrow-u-up-left', text: `Entregable «${str(d.deliverableTitle) ?? ''}» reabierto`, quote: str(d.reason) }
    case 'file_added': return { ...base, tone: 'people', icon: 'ph:paperclip', text: `Archivo añadido: «${str(d.name) ?? 'archivo'}»` }
    case 'file_removed': return { ...base, tone: 'people', icon: 'ph:trash', text: `Archivo borrado: «${str(d.name) ?? 'archivo'}»` }
    case 'cancel_requested': return { ...base, tone: 'people', icon: 'ph:prohibit', text: 'Propuesta de cancelar la colaboración', quote: str(d.reason) }
    case 'cancel_declined': return { ...base, tone: 'people', icon: 'ph:arrow-bend-up-right', text: 'Cancelación no aceptada: la colaboración sigue' }
    case 'cancel_withdrawn': return { ...base, tone: 'people', icon: 'ph:arrow-u-up-left', text: 'Propuesta de cancelación retirada' }
    case 'cancelled': return { ...base, tone: 'system', icon: 'ph:prohibit', text: 'Colaboración cancelada de común acuerdo', quote: str(d.reason) }
    case 'terminated': return { ...base, tone: 'people', icon: 'ph:warning-octagon', text: 'Colaboración terminada por incumplimiento', quote: str(d.reason) }
    default: return { ...base, tone: 'system', icon: 'ph:circle', text: e.kind }
  }
}

// Lo más reciente arriba: es lo que se viene a mirar.
const lines = computed(() => props.events.map(toLine).reverse().filter((l) => filter.value === 'all' || l.tone === 'people'))
</script>

<template>
  <div class="timeline" data-timeline>
    <SegmentedTabs v-model="filter" :options="filters" class="timeline__filter" />
    <p v-if="error" class="collab-error" role="alert">{{ error }}</p>
    <p v-else-if="!lines.length" class="timeline__empty">
      {{ filter === 'people' ? 'Todavía no hay mensajes ni acciones registrados.' : 'Todavía no hay actividad registrada.' }}
    </p>
    <ol v-else class="timeline__list">
      <li v-for="l in lines" :key="l.id" class="timeline__item" :data-tone="l.tone">
        <span class="timeline__dot" aria-hidden="true"><Icon :name="l.icon" class="size-4" /></span>
        <div class="timeline__body">
          <p class="timeline__text">{{ l.text }}</p>
          <blockquote v-if="l.quote" class="timeline__quote">{{ l.quote }}</blockquote>
          <p class="timeline__when"><template v-if="l.by">{{ l.by }} · </template>{{ l.when }}<template v-if="l.approximate"> · fecha aproximada</template></p>
        </div>
      </li>
    </ol>
  </div>
</template>

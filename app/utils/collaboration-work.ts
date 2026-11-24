import { expiryState } from './collab-expiry'
import { formatMoney } from './money'
import type { CollaborationStatus, PostStatus } from '~/types'
import type { CollaborationTerms } from './collaboration-terms'
import { hasAnyBriefSpecified, hasAnyTermsSpecified } from './collaboration-terms'

/**
 * Qué le toca hacer a cada parte en una colaboración. Única fuente de verdad de
 * dos pantallas: el «Siguiente paso» de la página de la colaboración y la bandeja
 * «Qué me toca». Es una función pura de datos que YA existen (estado de la
 * colaboración, fase de sus publicaciones y la cronología registrada): no inventa
 * nada que no esté en la base de datos.
 */
export type WorkRole = 'creator' | 'partner'

export interface WorkCollab extends CollaborationTerms {
  id: string
  status: CollaborationStatus
  initiatedBy: WorkRole
  counterpartName: string
  /** Texto del brief: sirve para distinguir tareas de varias colaboraciones con la misma persona. */
  brief?: string
  /** Nombre de campaña (si lo tiene): distingue tareas de varias colaboraciones con la misma persona. */
  campaignName?: string | null
  /** Importe de la propuesta inicial (para decir «antes X €» al recibir una contraoferta). */
  budgetCents?: number | null
  /** Caducidad de la solicitud pendiente: caducada ya no se puede aceptar, así que no es una tarea. */
  expiresAt?: string | null
  /** Perfil que ha propuesto cancelar de común acuerdo (null/ausente: nadie). Si es la otra parte, responder es lo más urgente. */
  /** Solo partner: publicaciones del creador que aún no ve (ideas y borradores). */
  hiddenPosts?: number
  cancelRequestedBy?: string | null
  cancelReason?: string | null
}

export interface WorkPost {
  id: string
  collaborationId?: string | null
  title: string
  status: PostStatus
  dueInDays: number
}

export interface WorkEvent {
  collaborationId: string
  kind: string
  postId: string | null
  actorProfileId: string | null
  detail: Record<string, unknown>
  createdAt: string
}

export type WorkTaskKind =
  | 'respond_request'
  | 'review_deliverable'
  | 'fix_changes'
  | 'send_deliverable'
  | 'start_deliverable'
  | 'complete_brief'
  | 'close_collaboration'
  | 'rate'
  | 'respond_offer'
  | 'assign_deliverable'
  | 'confirm_deliverables'
  | 'respond_cancel'

export interface WorkTask {
  id: string
  kind: WorkTaskKind
  collaborationId: string | null
  postId?: string
  counterpartName: string
  title: string
  detail?: string
  /** Más bajo = más urgente. */
  priority: number
  /** Texto del botón. */
  cta: string
  to: string
}

export interface WorkWaiting {
  collaborationId: string
  counterpartName: string
  text: string
  /** Qué hacer (o no) mientras tanto. Sin él, se dice que no hace falta hacer nada y que se avisará. */
  detail?: string
}

/** Un entregable tal como lo deriva la base de datos (vista `collaboration_deliverable_status`). */
export interface WorkDeliverable {
  id: string
  collaborationId: string
  title: string
  state: 'open' | 'in_progress' | 'in_review' | 'changes_requested' | 'approved' | 'accepted_without_approval' | 'waived'
  /** Exigible: del paquete, o definido por la marca y ya confirmado por el creador. */
  enforceable: boolean
  resolved: boolean
  postId: string | null
  postTitle: string | null
  lastReviewComment: string | null
  approvalInvalidated: boolean
}

export type DeliverableState = 'pending' | 'in_review' | 'changes' | 'approved'

/**
 * Estado de una entrega según su fase y la última revisión registrada:
 *  - «Para revisar» → en revisión;
 *  - vuelve a producción tras «pedir cambios» → cambios pedidos;
 *  - Programado/Publicado → aprobada (o sin revisión, en publicaciones sin colaboración);
 *  - el resto → pendiente.
 */
export function deliverableState(post: Pick<WorkPost, 'id' | 'status'>, events: WorkEvent[]): DeliverableState {
  if (post.status === 'ready_for_review') return 'in_review'
  if (post.status === 'scheduled' || post.status === 'published') return 'approved'
  const last = [...events].reverse().find((e) => e.postId === post.id && (e.kind === 'changes_requested' || e.kind === 'approved' || e.kind === 'deliverable_sent'))
  return last?.kind === 'changes_requested' ? 'changes' : 'pending'
}

function lastChangesComment(post: WorkPost, events: WorkEvent[]): string | undefined {
  const e = [...events].reverse().find((ev) => ev.postId === post.id && ev.kind === 'changes_requested')
  const c = e?.detail?.comment
  return typeof c === 'string' && c.trim() ? c.trim() : undefined
}

function clip(text: string, max = 110): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/**
 * «Campaña» o primera frase del brief, entre comillas, para distinguir tareas idénticas: con varias colaboraciones con la
 * misma marca, «Crea la primera publicación para X» salía repetido sin forma de saber de cuál era cada una.
 */
export function collabContext(c: Pick<WorkCollab, 'campaignName' | 'brief'>): string {
  const name = c.campaignName?.trim()
  if (name) return `«${clip(name, 50)}»`
  const brief = c.brief?.trim().split(/(?<=[.!?])\s|\n/)[0]
  return brief ? `«${clip(brief, 50)}»` : ''
}
const withContext = (c: Pick<WorkCollab, 'campaignName' | 'brief'>, text: string) => {
  const ctx = collabContext(c)
  return ctx ? `${ctx} · ${text}` : text
}

function dueText(dueInDays: number): string {
  if (dueInDays < 0) return `Atrasada ${Math.abs(dueInDays)} día${Math.abs(dueInDays) === 1 ? '' : 's'}`
  if (dueInDays === 0) return 'Vence hoy'
  if (dueInDays === 1) return 'Vence mañana'
  return `Vence en ${dueInDays} días`
}

/** Cada persona solo valora una vez: ¿ya lo hice yo? */
export function hasRated(events: WorkEvent[], myProfileId: string | null): boolean {
  return !!myProfileId && events.some((e) => e.kind === 'rated' && e.actorProfileId === myProfileId)
}

export function collaborationHref(role: WorkRole, collaborationId: string, query?: Record<string, string>): string {
  const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : ''
  return `/${role}/collaborations/${collaborationId}${qs}`
}

/**
 * En una solicitud pendiente, ¿la última propuesta de precio es mía (y por tanto espero respuesta)? Los turnos se
 * alternan: quien inició propone primero y cada contraoferta pasa la pelota. Antes se miraba solo quién inició, así
 * que tras una contraoferta las dos partes seguían viendo el mismo «siguiente paso» que antes de ella (el panel de
 * negociación sí lo tenía bien). Usa los eventos ya registrados; sin contraofertas, vale quien inició.
 */
export function iProposedLast(role: WorkRole, collab: Pick<WorkCollab, 'id' | 'initiatedBy'>, events: WorkEvent[], myProfileId: string | null): boolean {
  const last = [...events].reverse().find((e) => e.collaborationId === collab.id && e.kind === 'counteroffer')
  if (!last) return collab.initiatedBy === role
  return !!myProfileId && last.actorProfileId === myProfileId
}

/**
 * Tareas (acciones que dependen de mí) y, si no hay ninguna, a qué espera la
 * colaboración. Solo contempla colaboraciones vivas o recién completadas.
 */
export function collaborationWork(
  role: WorkRole,
  collab: WorkCollab,
  posts: WorkPost[],
  events: WorkEvent[],
  myProfileId: string | null,
  deliverables: WorkDeliverable[] = []
): { tasks: WorkTask[]; waiting: WorkWaiting | null } {
  const tasks: WorkTask[] = []
  const who = collab.counterpartName
  const base = { collaborationId: collab.id, counterpartName: who }
  const mine = posts.filter((p) => p.collaborationId === collab.id)
  const states = mine.map((p) => ({ post: p, state: deliverableState(p, events) }))
  let waitingText: string | null = null
  let waitingDetail: string | undefined

  if (collab.status === 'requested') {
    if (expiryState(collab.status, collab.expiresAt).expired) {
      // Una caducada ya no cambia sola: avisar de que «te avisaremos» era engañoso. Cada parte tiene una salida distinta.
      waitingText = `La propuesta con ${who} ha caducado`
      waitingDetail = iProposedLast(role, collab, events, myProfileId)
        ? 'Nadie respondió a tiempo. Retira la solicitud y envía una nueva si sigues interesado.'
        : 'No se respondió a tiempo. Puedes rechazarla; si te interesa, pide que te la envíen de nuevo.'
    } else if (iProposedLast(role, collab, events, myProfileId)) {
      waitingText = `Esperando la respuesta de ${who}`
    } else {
      // Si hay contraofertas, la última es de la otra parte: el siguiente paso dice el cambio de precio real.
      const counters = events.filter((e) => e.collaborationId === collab.id && e.kind === 'counteroffer')
      const last = counters.at(-1)
      const amountOf = (e?: WorkEvent) => (typeof e?.detail.budgetCents === 'number' ? (e.detail.budgetCents as number) : null)
      const now = amountOf(last)
      const before = counters.length > 1 ? amountOf(counters.at(-2)) : collab.budgetCents
      const message = typeof last?.detail.message === 'string' ? (last.detail.message as string).trim() : ''
      const counterDetail = now !== null
        ? `Propone ${formatMoney(now)}${before != null && before !== now ? ` (antes ${formatMoney(before)})` : ''}${message ? ` · «${clip(message, 70)}»` : ''}. Acepta, rechaza o propón otro presupuesto.`
        : null
      tasks.push({
        ...base, id: `respond:${collab.id}`, kind: 'respond_request', priority: 10,
        title: last ? `${who} te ha respondido con otro presupuesto` : `Responde a la solicitud de ${who}`,
        detail: counterDetail ?? (collab.brief ? `«${clip(collab.brief, 70)}» · acepta, rechaza o propón otro presupuesto.` : 'Acepta, rechaza o propón otro presupuesto.'),
        cta: 'Responder', to: collaborationHref(role, collab.id) + '#respuesta'
      })
    }
  } else if (collab.status === 'accepted' || collab.status === 'in_progress') {
    const delivs = deliverables.filter((d) => d.collaborationId === collab.id)

    // Una cancelación propuesta por la otra parte es lo más urgente: hasta que se responde, la colaboración está en el aire.
    if (collab.cancelRequestedBy) {
      if (collab.cancelRequestedBy === myProfileId) {
        waitingText = `Esperando la respuesta de ${who} a tu propuesta de cancelar`
      } else {
        const reason = collab.cancelReason?.trim()
        tasks.push({
          ...base, id: `cancel:${collab.id}`, kind: 'respond_cancel', priority: 8,
          title: `${who} propone cancelar la colaboración`,
          detail: `${reason ? `«${clip(reason, 80)}» · ` : ''}Acepta la cancelación o sigue adelante con la colaboración.`,
          cta: 'Responder', to: collaborationHref(role, collab.id) + '#cancelar'
        })
      }
    }

    if (delivs.length) {
      // Con entregables definidos, el estado de cada uno lo da la base de datos (vista derivada).
      const enforceable = delivs.filter((d) => d.enforceable)
      const unconfirmed = delivs.filter((d) => !d.enforceable)
      if (unconfirmed.length) {
        if (role === 'creator') {
          tasks.push({
            ...base, id: `confirm:${collab.id}`, kind: 'confirm_deliverables', priority: 24,
            title: `Confirma los entregables definidos por ${who}`,
            detail: `${unconfirmed.length} entregable${unconfirmed.length === 1 ? '' : 's'} por confirmar: hasta entonces no son exigibles.`,
            cta: 'Revisar y confirmar', to: collaborationHref(role, collab.id) + '#entregables'
          })
        } else {
          waitingText ??= `${who} tiene que confirmar los entregables que has definido`
        }
      }
      for (const d of enforceable) {
        const post = d.postId ? mine.find((p) => p.id === d.postId) : undefined
        const label = d.postTitle ?? d.title
        if (d.state === 'in_review') {
          if (role === 'partner' && d.postId) {
            tasks.push({
              ...base, id: `review:${d.postId}`, kind: 'review_deliverable', postId: d.postId, priority: 20,
              title: `Revisa «${label}»`, detail: `${who} la ha enviado a revisión (${d.title}).`,
              cta: 'Revisar', to: collaborationHref(role, collab.id, { post: d.postId }) + '#entregables'
            })
          } else if (role === 'creator') {
            waitingText ??= `${who} está revisando «${label}»`
          }
        } else if (d.state === 'changes_requested' && role === 'creator' && d.postId) {
          tasks.push({
            ...base, id: `fix:${d.postId}`, kind: 'fix_changes', postId: d.postId, priority: 25,
            title: `Corrige «${label}»`, detail: d.lastReviewComment ? `${who} pide: ${clip(d.lastReviewComment)}` : `${who} ha pedido cambios.`,
            cta: 'Corregir', to: `/creator/post/${d.postId}`
          })
        } else if (d.state === 'in_progress' && role === 'creator' && d.postId) {
          const late = (post?.dueInDays ?? 1) < 0
          tasks.push({
            ...base, id: `send:${d.postId}`, kind: 'send_deliverable', postId: d.postId,
            priority: d.approvalInvalidated ? 26 : late ? 22 : 30 + Math.min(Math.max(post?.dueInDays ?? 0, 0), 20),
            title: d.approvalInvalidated ? `Vuelve a enviar «${label}» a revisión` : `Envía «${label}» a revisión`,
            detail: d.approvalInvalidated ? 'Cambiaste el contenido y la aprobación anterior ya no vale.' : `${post ? dueText(post.dueInDays) + ' · ' : ''}${d.title}`,
            cta: 'Abrir publicación', to: `/creator/post/${d.postId}`
          })
        } else if (d.state === 'open' && role === 'creator') {
          tasks.push({
            ...base, id: `assign:${d.id}`, kind: 'assign_deliverable', priority: 33,
            title: `Asigna una publicación a «${d.title}»`, detail: 'Vincula una publicación existente o crea una nueva para este entregable.',
            cta: 'Asignar', to: collaborationHref(role, collab.id) + '#entregables'
          })
        }
      }
      if (role === 'partner' && !tasks.length) {
        const open = enforceable.filter((d) => !d.resolved).length
        if (open) waitingText ??= `${who} trabaja en ${open} entregable${open === 1 ? '' : 's'}`
      }
      if (enforceable.length && enforceable.every((d) => d.resolved)) {
        tasks.push({
          ...base, id: `close:${collab.id}`, kind: 'close_collaboration', priority: 50,
          title: `Cierra la colaboración con ${who}`, detail: collab.brief ? `«${clip(collab.brief, 70)}» · todos los entregables están resueltos.` : 'Todos los entregables están resueltos.',
          cta: 'Ver colaboración', to: collaborationHref(role, collab.id) + '#respuesta'
        })
      }
    } else {
      // Modo libre (sin entregables definidos): se parte de las publicaciones vinculadas, como siempre.
      for (const { post, state } of states) {
        if (state === 'in_review') {
          if (role === 'partner') {
            tasks.push({
              ...base, id: `review:${post.id}`, kind: 'review_deliverable', postId: post.id, priority: 20,
              title: `Revisa «${post.title}»`, detail: `${who} la ha enviado a revisión.`,
              cta: 'Revisar', to: collaborationHref(role, collab.id, { post: post.id }) + '#entregables'
            })
          } else {
            waitingText ??= `${who} está revisando «${post.title}»`
          }
        } else if (state === 'changes' && role === 'creator') {
          const comment = lastChangesComment(post, events)
          tasks.push({
            ...base, id: `fix:${post.id}`, kind: 'fix_changes', postId: post.id, priority: 25,
            title: `Corrige «${post.title}»`, detail: comment ? `${who} pide: ${clip(comment)}` : `${who} ha pedido cambios.`,
            cta: 'Corregir', to: `/creator/post/${post.id}`
          })
        } else if (state === 'pending' && role === 'creator') {
          const late = post.dueInDays < 0
          tasks.push({
            ...base, id: `send:${post.id}`, kind: 'send_deliverable', postId: post.id, priority: late ? 22 : 30 + Math.min(Math.max(post.dueInDays, 0), 20),
            title: `Envía «${post.title}» a revisión`, detail: `${dueText(post.dueInDays)} · ${who}`,
            cta: 'Abrir publicación', to: `/creator/post/${post.id}`
          })
        }
      }

      if (role === 'creator' && !mine.length) {
        tasks.push({
          ...base, id: `start:${collab.id}`, kind: 'start_deliverable', priority: 35,
          title: `Crea la primera publicación para ${who}`, detail: withContext(collab, 'Aún no hay ninguna publicación vinculada a esta colaboración.'),
          // Abre el formulario de nueva publicación con esta colaboración ya elegida (lo lee timeline.vue).
          cta: 'Crear publicación', to: `/creator/timeline?nueva=1&colaboracion=${collab.id}`
        })
      }
      if (role === 'partner' && !mine.length) waitingText ??= collab.hiddenPosts ? `${who} está preparando sus publicaciones` : `${who} aún no ha creado ninguna publicación`
      if (role === 'partner' && mine.length && !tasks.length) {
        const pending = states.filter((s) => s.state === 'pending' || s.state === 'changes').length
        if (pending) waitingText ??= `${who} trabaja en ${pending} entrega${pending === 1 ? '' : 's'}`
      }
      if (states.length && states.every((s) => s.state === 'approved')) {
        tasks.push({
          ...base, id: `close:${collab.id}`, kind: 'close_collaboration', priority: 50,
          title: `Cierra la colaboración con ${who}`, detail: collab.brief ? `«${clip(collab.brief, 70)}» · todas las entregas están aprobadas.` : 'Todas las entregas están aprobadas.',
          cta: 'Ver colaboración', to: collaborationHref(role, collab.id) + '#respuesta'
        })
      }
    }

    if (role === 'partner' && !hasAnyBriefSpecified(collab) && !hasAnyTermsSpecified(collab)) {
      tasks.push({
        ...base, id: `brief:${collab.id}`, kind: 'complete_brief', priority: 40,
        title: `Completa el brief para ${who}`, detail: collab.brief ? `«${clip(collab.brief, 70)}» · objetivo, público, tono y condiciones se fijan una sola vez.` : 'Objetivo, público, tono y condiciones: se fijan una sola vez.',
        cta: 'Completar brief', to: collaborationHref(role, collab.id) + '#brief'
      })
    }
  } else if (collab.status === 'completed') {
    if (!hasRated(events, myProfileId)) {
      tasks.push({
        ...base, id: `rate:${collab.id}`, kind: 'rate', priority: 60,
        title: `Valora a ${who}`, detail: withContext(collab, 'Tu valoración ayuda a otros usuarios.'),
        cta: 'Valorar', to: collaborationHref(role, collab.id) + '#respuesta'
      })
    }
  }

  // Si yo he propuesto cancelar y la colaboración sigue activa, que la tarea de hoy no lo oculte.
  if (tasks.length && collab.cancelRequestedBy && collab.cancelRequestedBy === myProfileId && (collab.status === 'accepted' || collab.status === 'in_progress')) {
    for (const t of tasks) t.detail = `${t.detail ? `${t.detail} ` : ''}(Propusiste cancelar: esperas la respuesta de ${who}.)`
  }

  tasks.sort((a, b) => a.priority - b.priority)
  return { tasks, waiting: waitingText ? { collaborationId: collab.id, counterpartName: who, text: waitingText, ...(waitingDetail ? { detail: waitingDetail } : {}) } : null }
}

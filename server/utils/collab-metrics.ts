/**
 * Métricas propias de CIBERAN: se calculan SOLO con lo que la plataforma ya guarda
 * (colaboraciones, cronología, publicaciones vinculadas y valoraciones). No dependen de
 * ninguna red social ni servicio externo.
 *
 * Cómo se calcula cada indicador (la interfaz enseña este mismo texto, ver METRIC_NOTES):
 *
 *  · Iniciadas      todas las colaboraciones creadas en el periodo, en cualquier estado.
 *  · Aceptadas      las que llegaron a aceptarse alguna vez (hoy aceptadas, en curso, completadas,
 *                   canceladas o terminadas, o con un evento «aceptada» en su cronología).
 *  · Completadas    estado «completada». Canceladas y terminadas por incumplimiento NUNCA cuentan aquí.
 *  · Éxito          completadas ÷ (completadas + canceladas + terminadas por incumplimiento).
 *                   Las que siguen abiertas no entran: todavía no han acabado ni bien ni mal.
 *  · A tiempo       entregas enviadas a revisión (o publicadas) no más tarde del final del día de su
 *                   fecha de entrega ÷ entregas con fecha que ya se han entregado o ya han vencido.
 *                   Quedan fuera: las que no tienen fecha, las que aún no han vencido, las de
 *                   colaboraciones cerradas antes de entregarse y las antiguas sin registro de cuándo se enviaron.
 *  · Respuesta      horas entre que se crea la solicitud y la primera respuesta de quien la recibe
 *                   (aceptar, rechazar o contraofertar). Solo con eventos de fecha exacta.
 *  · Hasta aceptar  horas entre la creación y el evento «aceptada» (fecha exacta).
 *  · Revisiones     peticiones de cambios ÷ entregas que se han enviado a revisión al menos una vez.
 *  · Valoración     media de estrellas recibidas.
 *  · Presupuesto    media del importe acordado en las colaboraciones aceptadas que tienen importe.
 *
 * Los eventos reconstruidos de colaboraciones antiguas (marcados `approximate`) no se usan para
 * medir tiempos: su fecha no es fiable. Cuando un indicador no tiene datos, vale `null`; nunca se inventa.
 */
export type MetricRole = 'creator' | 'partner'

export interface MCollab {
  id: string
  status: string
  createdAt: string
  budgetCents: number | null
  initiatedBy: MetricRole
  creatorProfileId: string | null
  partnerProfileId: string | null
  terminatedBy: string | null
  /** Categorías con las que se reparte la colaboración (las de la otra parte; en admin, las del creador). */
  categories: string[]
}
export interface MEvent {
  collaborationId: string
  kind: string
  createdAt: string
  postId: string | null
  actorProfileId: string | null
  approximate: boolean
}
export interface MPost {
  id: string
  collaborationId: string
  dueDate: string | null
  status: string
  publishedAt: string | null
}
export interface MRating { rateeProfileId: string; stars: number }

export interface Avg { value: number; n: number }
export interface MetricsResult {
  totals: { started: number; accepted: number; completed: number; cancelled: number; terminated: number; declined: number; pending: number; open: number }
  /** Solo con perspectiva de un usuario. */
  terminatedByMe: number
  terminatedAgainstMe: number
  successRate: Avg | null
  onTime: { rate: Avg | null; onTime: number; late: number; noDueDate: number; notDueYet: number; unknown: number }
  /** Con perspectiva: `mine` = lo que tardo yo, `counterpart` = lo que tarda la otra parte. Sin ella: creadores y marcas. */
  responseHours: { mine: Avg | null; counterpart: Avg | null; creators: Avg | null; partners: Avg | null }
  hoursToAccept: Avg | null
  revisionsPerDeliverable: Avg | null
  rating: Avg | null
  avgBudgetCents: Avg | null
  byMonth: { month: string; started: number; accepted: number; completed: number; cancelled: number; terminated: number }[]
  byCategory: { category: string; count: number }[]
}

export const ACCEPTED_EVER = ['accepted', 'in_progress', 'completed', 'cancelled', 'terminated']
const RESPONSE_KINDS = ['accepted', 'declined', 'counteroffer']
const DELIVERY_KINDS = ['deliverable_sent', 'deliverable_published', 'approved', 'deliverable_accepted_without_approval']
const HOUR = 3_600_000

const avg = (values: number[]): Avg | null => (values.length ? { value: values.reduce((s, v) => s + v, 0) / values.length, n: values.length } : null)
const monthOf = (iso: string) => iso.slice(0, 7)
/** Final del día (UTC) de una fecha de entrega: entregar ese mismo día cuenta como a tiempo. */
export function endOfDueDay(iso: string): number {
  const d = new Date(iso)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)
}

/** Meses naturales desde `since` hasta `now`, ambos incluidos, como 'AAAA-MM'. */
export function monthRange(since: Date, now: Date): string[] {
  const out: string[] = []
  let y = since.getUTCFullYear()
  let m = since.getUTCMonth()
  while (y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m <= now.getUTCMonth())) {
    out.push(`${y}-${String(m + 1).padStart(2, '0')}`)
    m += 1
    if (m > 11) { m = 0; y += 1 }
  }
  return out
}

export interface MetricsInput { collabs: MCollab[]; events: MEvent[]; posts: MPost[]; ratings: MRating[] }
export interface MetricsOptions {
  now?: Date
  /** Solo colaboraciones creadas desde esta fecha. Sin ella, todas. */
  since?: Date | null
  /** Calcula «mío / de la otra parte» y las valoraciones recibidas por este perfil. */
  perspective?: { role: MetricRole; profileId: string } | null
}

export function computeMetrics(input: MetricsInput, options: MetricsOptions = {}): MetricsResult {
  const now = options.now ?? new Date()
  const me = options.perspective ?? null
  const sinceMs = options.since ? options.since.getTime() : null
  const collabs = input.collabs.filter((c) => sinceMs === null || new Date(c.createdAt).getTime() >= sinceMs)
  const ids = new Set(collabs.map((c) => c.id))
  const byId = new Map(collabs.map((c) => [c.id, c]))

  const eventsByCollab = new Map<string, MEvent[]>()
  const eventsByPost = new Map<string, MEvent[]>()
  for (const e of [...input.events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!ids.has(e.collaborationId)) continue
    ;(eventsByCollab.get(e.collaborationId) ?? eventsByCollab.set(e.collaborationId, []).get(e.collaborationId)!).push(e)
    if (e.postId) (eventsByPost.get(e.postId) ?? eventsByPost.set(e.postId, []).get(e.postId)!).push(e)
  }

  const everAccepted = (c: MCollab) => ACCEPTED_EVER.includes(c.status) || (eventsByCollab.get(c.id) ?? []).some((e) => e.kind === 'accepted')
  const count = (pred: (c: MCollab) => boolean) => collabs.filter(pred).length

  const totals = {
    started: collabs.length,
    accepted: count(everAccepted),
    completed: count((c) => c.status === 'completed'),
    cancelled: count((c) => c.status === 'cancelled'),
    terminated: count((c) => c.status === 'terminated'),
    declined: count((c) => c.status === 'declined'),
    pending: count((c) => c.status === 'requested'),
    open: count((c) => c.status === 'accepted' || c.status === 'in_progress')
  }
  const closed = totals.completed + totals.cancelled + totals.terminated
  const successRate = closed ? { value: totals.completed / closed, n: closed } : null

  // ---- Tiempos de respuesta y hasta la aceptación (solo eventos con fecha exacta) ----
  const response: Record<MetricRole, number[]> = { creator: [], partner: [] }
  const toAccept: number[] = []
  for (const c of collabs) {
    const created = new Date(c.createdAt).getTime()
    const exact = (eventsByCollab.get(c.id) ?? []).filter((e) => !e.approximate)
    const responder: MetricRole = c.initiatedBy === 'creator' ? 'partner' : 'creator'
    const responderProfile = responder === 'creator' ? c.creatorProfileId : c.partnerProfileId
    const first = exact.find((e) => RESPONSE_KINDS.includes(e.kind) && (e.actorProfileId === null || e.actorProfileId === responderProfile))
    if (first) {
      const h = (new Date(first.createdAt).getTime() - created) / HOUR
      if (h >= 0) response[responder].push(h)
    }
    const accepted = exact.find((e) => e.kind === 'accepted')
    if (accepted) {
      const h = (new Date(accepted.createdAt).getTime() - created) / HOUR
      if (h >= 0) toAccept.push(h)
    }
  }
  const other: MetricRole | null = me ? (me.role === 'creator' ? 'partner' : 'creator') : null

  // ---- Entregas a tiempo y revisiones ----
  const onTime = { rate: null as Avg | null, onTime: 0, late: 0, noDueDate: 0, notDueYet: 0, unknown: 0 }
  const revisions: number[] = []
  for (const p of input.posts) {
    const c = byId.get(p.collaborationId)
    if (!c || !everAccepted(c)) continue
    const evs = eventsByPost.get(p.id) ?? []
    if (evs.some((e) => e.kind === 'deliverable_sent')) revisions.push(evs.filter((e) => e.kind === 'changes_requested').length)

    if (!p.dueDate) { onTime.noDueDate += 1; continue }
    const due = endOfDueDay(p.dueDate)
    const deliveredEvent = evs.find((e) => DELIVERY_KINDS.includes(e.kind))
    const deliveredAt = deliveredEvent ? new Date(deliveredEvent.createdAt).getTime() : p.publishedAt ? new Date(p.publishedAt).getTime() : null
    if (deliveredAt !== null) {
      if (deliveredAt <= due) onTime.onTime += 1
      else onTime.late += 1
    } else if (['ready_for_review', 'scheduled', 'published'].includes(p.status)) {
      onTime.unknown += 1 // entregada, pero sin registro de cuándo (anterior a la cronología)
    } else if (c.status === 'cancelled' || c.status === 'terminated' || c.status === 'declined') {
      onTime.unknown += 1 // la colaboración se cerró antes de entregarse: no es un retraso
    } else if (due < now.getTime()) {
      onTime.late += 1
    } else {
      onTime.notDueYet += 1
    }
  }
  const base = onTime.onTime + onTime.late
  onTime.rate = base ? { value: onTime.onTime / base, n: base } : null

  // ---- Valoraciones, presupuesto, reparto ----
  const ratings = me ? input.ratings.filter((r) => r.rateeProfileId === me.profileId) : input.ratings
  const budgets = collabs.filter((c) => everAccepted(c) && (c.budgetCents ?? 0) > 0).map((c) => c.budgetCents as number)

  const months = new Map<string, MetricsResult['byMonth'][number]>()
  const firstMonth = collabs.length ? collabs.map((c) => c.createdAt).sort()[0]! : null
  const start = options.since ?? (firstMonth ? new Date(firstMonth) : null)
  if (start) for (const m of monthRange(start, now)) months.set(m, { month: m, started: 0, accepted: 0, completed: 0, cancelled: 0, terminated: 0 })
  const categories = new Map<string, number>()
  for (const c of collabs) {
    const row = months.get(monthOf(c.createdAt))
    if (row) {
      row.started += 1
      if (everAccepted(c)) row.accepted += 1
      if (c.status === 'completed') row.completed += 1
      if (c.status === 'cancelled') row.cancelled += 1
      if (c.status === 'terminated') row.terminated += 1
    }
    for (const cat of new Set(c.categories)) categories.set(cat, (categories.get(cat) ?? 0) + 1)
  }

  return {
    totals,
    terminatedByMe: me ? count((c) => c.status === 'terminated' && c.terminatedBy === me.profileId) : 0,
    terminatedAgainstMe: me ? count((c) => c.status === 'terminated' && c.terminatedBy !== null && c.terminatedBy !== me.profileId) : 0,
    successRate,
    onTime,
    responseHours: {
      mine: me ? avg(response[me.role]) : null,
      counterpart: other ? avg(response[other]) : null,
      creators: avg(response.creator),
      partners: avg(response.partner)
    },
    hoursToAccept: avg(toAccept),
    revisionsPerDeliverable: avg(revisions),
    rating: avg(ratings.map((r) => r.stars)),
    avgBudgetCents: avg(budgets),
    byMonth: [...months.values()],
    byCategory: [...categories.entries()].map(([category, n]) => ({ category, count: n })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
  }
}

/** Periodos que admite la API: últimos 3, 6 o 12 meses naturales, o todo. */
export function sinceForRange(range: unknown, now = new Date()): Date | null {
  const months = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 0
  if (!months) return null
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))
}

// ---- Lectura de datos: la misma para el usuario (cliente con su sesión → RLS) y para admin (clave de servicio) ----
interface CollabRow {
  id: string; status: string; created_at: string; budget_cents: number | null; initiated_by: MetricRole; terminated_by: string | null
  creators: { profile_id: string; categories: string[] | null; display_name: string } | null
  partners: { profile_id: string; categories: string[] | null; company_name: string } | null
}
export interface LoadedMetricsData extends MetricsInput {
  names: Record<string, { name: string; role: MetricRole }>
}

const EVENT_KINDS = [...new Set([...RESPONSE_KINDS, ...DELIVERY_KINDS, 'changes_requested'])]
const chunk = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

/**
 * Lee lo necesario para `computeMetrics`. `scope` limita a las colaboraciones de una ficha
 * (además de lo que ya limite RLS); sin `scope` lee todo lo que el cliente pueda ver.
 * `categoriesOf` decide de quién son las categorías con las que se reparte.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadMetricsData(client: any, opts: { scope?: { column: 'creator_id' | 'partner_id'; id: string }; categoriesOf: 'creator' | 'partner'; limit?: number; since?: Date | null }): Promise<LoadedMetricsData> {
  let q = client.from('collaborations')
    .select('id, status, created_at, budget_cents, initiated_by, terminated_by, creators(profile_id, categories, display_name), partners(profile_id, categories, company_name)')
    .order('created_at', { ascending: false }).limit(opts.limit ?? 2000)
  if (opts.scope) q = q.eq(opts.scope.column, opts.scope.id)
  if (opts.since) q = q.gte('created_at', opts.since.toISOString())
  const { data: rows, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se han podido leer las colaboraciones.' })

  const names: LoadedMetricsData['names'] = {}
  const collabs: MCollab[] = ((rows ?? []) as CollabRow[]).map((r) => {
    if (r.creators) names[r.creators.profile_id] = { name: r.creators.display_name, role: 'creator' }
    if (r.partners) names[r.partners.profile_id] = { name: r.partners.company_name, role: 'partner' }
    return {
      id: r.id, status: r.status, createdAt: r.created_at, budgetCents: r.budget_cents, initiatedBy: r.initiated_by, terminatedBy: r.terminated_by,
      creatorProfileId: r.creators?.profile_id ?? null, partnerProfileId: r.partners?.profile_id ?? null,
      categories: (opts.categoriesOf === 'creator' ? r.creators?.categories : r.partners?.categories) ?? []
    }
  })

  const events: MEvent[] = []
  const posts: MPost[] = []
  for (const ids of chunk(collabs.map((c) => c.id), 100)) {
    const [ev, po] = await Promise.all([
      client.from('collaboration_events').select('collaboration_id, kind, created_at, post_id, actor_profile_id, detail').in('collaboration_id', ids).in('kind', EVENT_KINDS).limit(10000),
      client.from('posts').select('id, collaboration_id, due_date, status, published_at').in('collaboration_id', ids).limit(5000)
    ])
    for (const e of (ev.data ?? []) as { collaboration_id: string; kind: string; created_at: string; post_id: string | null; actor_profile_id: string | null; detail: Record<string, unknown> | null }[]) {
      events.push({ collaborationId: e.collaboration_id, kind: e.kind, createdAt: e.created_at, postId: e.post_id, actorProfileId: e.actor_profile_id, approximate: e.detail?.approximate === true })
    }
    for (const p of (po.data ?? []) as { id: string; collaboration_id: string; due_date: string | null; status: string; published_at: string | null }[]) {
      posts.push({ id: p.id, collaborationId: p.collaboration_id, dueDate: p.due_date, status: p.status, publishedAt: p.published_at })
    }
  }
  return { collabs, events, posts, ratings: [], names }
}

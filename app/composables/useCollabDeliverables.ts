import type { WorkDeliverable } from '~/utils/collaboration-work'

interface StatusRow {
  deliverable_id: string
  collaboration_id: string
  position: number
  title: string
  origin: 'package' | 'defined'
  confirmed_at: string | null
  post_id: string | null
  post_title: string | null
  post_status: string | null
  due_date: string | null
  content_version: number | null
  published_version: number | null
  last_review_kind: 'approved' | 'changes_requested' | null
  last_review_version: number | null
  last_review_comment: string | null
  decision_kind: 'waived' | 'accepted_without_approval' | 'reopened' | null
  decision_reason: string | null
  decided_by: string | null
  decided_at: string | null
  decision_version: number | null
  state: WorkDeliverable['state']
  resolved: boolean
  enforceable: boolean
  approval_invalidated: boolean
  edited_after_publish: boolean
  approval_missing: boolean
  decision_outdated: boolean
}

/** Decisión de la marca sobre un entregable (o su reapertura), en el diálogo con motivo obligatorio. */
export type DecisionMode = 'waived' | 'accepted_without_approval' | 'reopen'

export interface CollabDeliverable extends WorkDeliverable {
  position: number
  origin: 'package' | 'defined'
  confirmedAt: string | null
  postTitle: string | null
  postStatus: string | null
  dueDate: string | null
  contentVersion: number | null
  lastReviewComment: string | null
  decisionKind: 'waived' | 'accepted_without_approval' | 'reopened' | null
  decisionReason: string | null
  decidedBy: string | null
  decidedAt: string | null
  editedAfterPublish: boolean
  approvalMissing: boolean
  decisionOutdated: boolean
}

const COLUMNS = 'deliverable_id, collaboration_id, position, title, origin, confirmed_at, post_id, post_title, post_status, due_date, content_version, published_version, last_review_kind, last_review_version, last_review_comment, decision_kind, decision_reason, decided_by, decided_at, decision_version, state, resolved, enforceable, approval_invalidated, edited_after_publish, approval_missing, decision_outdated'

function mapRow(r: StatusRow): CollabDeliverable {
  return {
    id: r.deliverable_id, collaborationId: r.collaboration_id, position: r.position, title: r.title, origin: r.origin,
    confirmedAt: r.confirmed_at, postId: r.post_id, postTitle: r.post_title, postStatus: r.post_status, dueDate: r.due_date,
    contentVersion: r.content_version, lastReviewComment: r.last_review_comment,
    decisionKind: r.decision_kind, decisionReason: r.decision_reason, decidedBy: r.decided_by, decidedAt: r.decided_at,
    state: r.state, resolved: r.resolved, enforceable: r.enforceable,
    approvalInvalidated: r.approval_invalidated, editedAfterPublish: r.edited_after_publish,
    approvalMissing: r.approval_missing, decisionOutdated: r.decision_outdated
  }
}

/**
 * Entregables de las colaboraciones (migraciones 20261105100000/110000/120000). El estado de cada
 * uno lo DERIVA la base de datos (vista `collaboration_deliverable_status`: hueco + publicación +
 * versión + última revisión + última decisión): aquí no se infiere nada. Todas las escrituras son
 * RPC; el cliente no tiene permiso sobre las tablas. Las acciones recargan lo leído y propagan el
 * mensaje de error del servidor (ya en castellano) para mostrarlo tal cual.
 */
export function useCollabDeliverables() {
  const client = useSupabaseClient()
  const byCollab = useState<Record<string, CollabDeliverable[]>>('collab-deliverables-by-collab', () => ({}))
  const acting = useState<string | null>('collab-deliverables-acting', () => null)

  async function load(collaborationId: string, force = false) {
    if (!force && byCollab.value[collaborationId]) return byCollab.value[collaborationId]
    const { data, error } = await client
      .from('collaboration_deliverable_status')
      .select(COLUMNS)
      .eq('collaboration_id', collaborationId)
      .order('position', { ascending: true })
    if (error) {
      console.error('[useCollabDeliverables] fallo al cargar los entregables:', error.message)
      return byCollab.value[collaborationId] ?? []
    }
    const list = (data as StatusRow[]).map(mapRow)
    byCollab.value = { ...byCollab.value, [collaborationId]: list }
    return list
  }

  async function loadMany(collaborationIds: string[]) {
    if (!collaborationIds.length) return
    const { data, error } = await client
      .from('collaboration_deliverable_status')
      .select(COLUMNS)
      .in('collaboration_id', collaborationIds)
      .order('position', { ascending: true })
      .limit(1000)
    if (error) {
      console.error('[useCollabDeliverables] fallo al cargar los entregables:', error.message)
      return
    }
    const grouped: Record<string, CollabDeliverable[]> = Object.fromEntries(collaborationIds.map((id) => [id, []]))
    for (const row of (data as StatusRow[]).map(mapRow)) grouped[row.collaborationId]?.push(row)
    byCollab.value = { ...byCollab.value, ...grouped }
  }

  async function call(fn: string, args: Record<string, unknown>, collaborationId: string, key: string) {
    acting.value = key
    try {
      const { data, error } = await client.rpc(fn as never, args as never)
      if (error) throw new Error(error.message)
      await load(collaborationId, true)
      return data
    } finally {
      acting.value = null
    }
  }

  const assign = (d: { id: string; collaborationId: string }, postId: string) =>
    call('assign_deliverable', { p_deliverable_id: d.id, p_post_id: postId }, d.collaborationId, d.id)
  const unassign = (d: { id: string; collaborationId: string }) =>
    call('unassign_deliverable', { p_deliverable_id: d.id }, d.collaborationId, d.id)
  const resolve = (d: { id: string; collaborationId: string }, resolution: 'waived' | 'accepted_without_approval', reason: string) =>
    call('resolve_deliverable', { p_deliverable_id: d.id, p_resolution: resolution, p_reason: reason }, d.collaborationId, d.id)
  const reopen = (d: { id: string; collaborationId: string }, reason: string) =>
    call('reopen_deliverable', { p_deliverable_id: d.id, p_reason: reason }, d.collaborationId, d.id)
  const define = (collaborationId: string, titles: string[]) =>
    call('define_deliverables', { p_collaboration_id: collaborationId, p_titles: titles }, collaborationId, `define:${collaborationId}`)
  const confirm = (collaborationId: string) =>
    call('confirm_deliverables', { p_collaboration_id: collaborationId }, collaborationId, `confirm:${collaborationId}`)

  return { byCollab, acting, load, loadMany, assign, unassign, resolve, reopen, define, confirm }
}

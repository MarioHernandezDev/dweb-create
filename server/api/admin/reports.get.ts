import { serverSupabaseServiceRole } from '#supabase/server'

interface ReportRow {
  id: string; reason: string; detail: string | null; created_at: string; status: string; admin_note: string | null; resolved_at: string | null
  assigned_to: string | null; assigned_name: string | null; reporter_profile_id: string; reporter_name: string | null; reporter_role: string | null
  collaboration_id: string | null; collaboration_brief: string | null; collaboration_status: string | null; budget_cents: number | null; paid: boolean | null
  creator_name: string | null; partner_name: string | null; reported_profile_id: string | null; reported_name: string | null
}

/**
 * Bandeja de reportes (vista `admin_reports_view`), paginada y filtrada en la base. Por defecto los pendientes
 * (abiertos + en revisión), los más antiguos primero. Parámetros: status (pending|open|reviewing|resolved|dismissed|all),
 * reason, assigned (me|none|<id de miembro>), q, sort (oldest|newest), profile (cuenta reportada o que reporta), page, pageSize.
 * Ver supabase/migrations/20261021140000_collaboration_offers_and_reports.sql y 20261112120000_report_review_workflow.sql.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const q = getQuery(event)
  const { page, pageSize, from, to } = pageParams(q, 20, 100)
  const client = serverSupabaseServiceRole(event)

  let query = client.from('admin_reports_view').select('*', { count: 'exact' })
  const status = typeof q.status === 'string' ? q.status : 'pending'
  if (status === 'pending') query = query.in('status', ['open', 'reviewing'])
  else if (['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) query = query.eq('status', status)
  if (typeof q.reason === 'string' && ['spam', 'unrealistic_budget', 'inappropriate', 'other', 'breach'].includes(q.reason)) query = query.eq('reason', q.reason)
  if (q.assigned === 'none') query = query.is('assigned_to', null)
  else if (q.assigned === 'me' && actor.memberId) query = query.eq('assigned_to', actor.memberId)
  else if (typeof q.assigned === 'string' && UUID_RE.test(q.assigned)) query = query.eq('assigned_to', q.assigned)
  if (typeof q.profile === 'string' && UUID_RE.test(q.profile)) query = query.or(`reporter_profile_id.eq.${q.profile},reported_profile_id.eq.${q.profile}`)
  const term = searchTerm(q.q)
  if (term) query = query.or(orIlike(['detail', 'reporter_name', 'reported_name', 'collaboration_brief', 'creator_name', 'partner_name'], term))

  query = query.order('created_at', { ascending: q.sort === 'oldest' || (q.sort === undefined && status === 'pending') })
  const { data, error, count } = await query.order('id', { ascending: true }).range(from, to)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const reports = ((data ?? []) as ReportRow[]).map((r) => ({
    id: r.id, reason: r.reason, detail: r.detail, createdAt: r.created_at, status: r.status, adminNote: r.admin_note, resolvedAt: r.resolved_at,
    assignedTo: r.assigned_to, assignedName: r.assigned_name,
    reporterName: r.reporter_name ?? 'Sin nombre', reporterRole: r.reporter_role, reporterProfileId: r.reporter_profile_id,
    collaborationId: r.collaboration_id, collaborationBrief: r.collaboration_brief, collaborationStatus: r.collaboration_status,
    budgetCents: r.budget_cents, paid: !!r.paid, creatorName: r.creator_name, partnerName: r.partner_name,
    reportedName: r.reported_name, reportedProfileId: r.reported_profile_id
  }))
  return { reports, total: count ?? reports.length, page, pageSize }
})

import { serverSupabaseServiceRole } from '#supabase/server'
import { loadDeletionBlockers } from '../../../utils/account-deletion'

/**
 * Ficha completa de una cuenta para el equipo: datos de la cuenta, colaboraciones, reportes (hechos y recibidos),
 * solicitud de eliminación, colaboraciones abiertas que impedirían borrarla y lo que el propio equipo ha hecho sobre ella.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_RE.test(id)) throw createError({ statusCode: 400, statusMessage: 'Id de usuario no válido.' })
  const client = serverSupabaseServiceRole(event)

  const { data: account, error } = await client.from('admin_users_view').select('*').eq('id', id).maybeSingle<Record<string, unknown>>()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!account) throw createError({ statusCode: 404, statusMessage: 'No existe esa cuenta.' })

  const creatorId = account.creator_id as string | null
  const { data: partner } = await client.from('partners').select('id').eq('profile_id', id).maybeSingle<{ id: string }>()
  const sides = [creatorId ? `creator_id.eq.${creatorId}` : null, partner?.id ? `partner_id.eq.${partner.id}` : null].filter(Boolean).join(',')

  const [collabs, reports, deletion, audit, blockers] = await Promise.all([
    sides
      ? client.from('collaborations').select('id, status, brief, package_title, budget_cents, paid_at, created_at, initiated_by, creators(display_name), partners(company_name)').or(sides).order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
    client.from('admin_reports_view').select('id, reason, status, created_at, detail, reporter_profile_id, reporter_name, reported_profile_id, reported_name, collaboration_id').or(`reporter_profile_id.eq.${id},reported_profile_id.eq.${id}`).order('created_at', { ascending: false }).limit(50),
    client.from('admin_deletion_requests_view').select('id, status, reason, created_at, resolved_at, assigned_name').eq('profile_id', id).maybeSingle(),
    client.from('admin_audit_log').select('id, created_at, actor_name, action, detail').eq('target_id', id).order('created_at', { ascending: false }).limit(50),
    loadDeletionBlockers(client, id)
  ])

  type CollabRow = { id: string; status: string; brief: string | null; package_title: string | null; budget_cents: number | null; paid_at: string | null; created_at: string; initiated_by: string; creators: { display_name: string } | null; partners: { company_name: string } | null }
  type ReportRow = { id: string; reason: string; status: string; created_at: string; detail: string | null; reporter_profile_id: string; reporter_name: string | null; reported_profile_id: string | null; reported_name: string | null; collaboration_id: string | null }
  const collabRows = (collabs.data ?? []) as unknown as CollabRow[]
  const byStatus: Record<string, number> = {}
  for (const c of collabRows) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1

  return {
    account: {
      id, email: account.email, fullName: account.full_name, role: account.role, createdAt: account.created_at, lastSignInAt: account.last_sign_in_at,
      banned: account.banned, creatorId, partnerVerified: account.partner_verified, displayName: account.display_name,
      planId: account.plan_id, planStatus: account.plan_status, planExpiresAt: account.plan_expires_at, deletionPending: account.deletion_pending
    },
    collaborations: collabRows.map((c) => ({
      id: c.id, status: c.status, title: (c.package_title || c.brief || 'Sin título').slice(0, 90), budgetCents: c.budget_cents, paid: !!c.paid_at, createdAt: c.created_at,
      creatorName: c.creators?.display_name ?? null, partnerName: c.partners?.company_name ?? null
    })),
    collaborationsByStatus: byStatus,
    reports: ((reports.data ?? []) as ReportRow[]).map((r) => ({
      id: r.id, reason: r.reason, status: r.status, createdAt: r.created_at, detail: r.detail, direction: r.reporter_profile_id === id ? 'made' : 'received',
      reporterName: r.reporter_name, reportedName: r.reported_name, collaborationId: r.collaboration_id
    })),
    deletionRequest: deletion.data ?? null,
    openCollaborations: blockers ?? [],
    audit: ((audit.data ?? []) as { id: number; created_at: string; actor_name: string; action: string; detail: Record<string, unknown> | null }[]).map((a) => ({
      id: a.id, createdAt: a.created_at, actorName: a.actor_name, action: a.action, detail: a.detail
    }))
  }
})

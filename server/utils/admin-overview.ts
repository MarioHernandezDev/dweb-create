import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { ALERT_THRESHOLDS, type AdminAlert, buildAdminAlerts, topHotspots } from './admin-alerts'

export interface AdminOverview {
  counts: { reportsOpen: number; reportsReviewing: number; reportsUnassigned: number; deletionsPending: number }
  alerts: AdminAlert[]
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

/** Recuentos para las insignias de las pestañas y alertas de lo que lleva demasiado sin atender. Solo recuentos (consultas `head`), sin traer filas. */
export async function loadAdminOverview(event: H3Event): Promise<AdminOverview> {
  const client = serverSupabaseServiceRole(event)
  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: c, error } = await q
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return c ?? 0
  }
  const reports = () => client.from('reports').select('id', { count: 'exact', head: true })

  const [open, reviewing, unassigned, deletions, stale, staleDeletions, last24h, oldest, hotspotRows] = await Promise.all([
    count(reports().eq('status', 'open')),
    count(reports().eq('status', 'reviewing')),
    count(reports().in('status', ['open', 'reviewing']).is('assigned_to', null)),
    count(client.from('account_deletion_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
    count(reports().in('status', ['open', 'reviewing']).lt('created_at', hoursAgo(ALERT_THRESHOLDS.reportStaleHours))),
    count(client.from('account_deletion_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').lt('created_at', hoursAgo(ALERT_THRESHOLDS.deletionStaleHours))),
    count(reports().gte('created_at', hoursAgo(24))),
    client.from('reports').select('created_at').in('status', ['open', 'reviewing']).order('created_at', { ascending: true }).limit(1).maybeSingle<{ created_at: string }>(),
    client.from('admin_reports_view').select('reported_profile_id, reported_name').gte('created_at', hoursAgo(ALERT_THRESHOLDS.hotspotDays * 24)).limit(2000)
  ])

  const oldestHours = oldest.data ? (Date.now() - new Date(oldest.data.created_at).getTime()) / 3_600_000 : null
  const alerts = buildAdminAlerts({
    staleReports: stale, oldestStaleReportHours: stale ? oldestHours : null, staleDeletions, reportsLast24h: last24h,
    hotspots: topHotspots((hotspotRows.data ?? []) as { reported_profile_id: string | null; reported_name: string | null }[])
  })
  return { counts: { reportsOpen: open, reportsReviewing: reviewing, reportsUnassigned: unassigned, deletionsPending: deletions }, alerts }
}

import { serverSupabaseServiceRole } from '#supabase/server'

interface ReportRow {
  id: string
  reason: string
  detail: string | null
  created_at: string
  status: string
  admin_note: string | null
  resolved_at: string | null
  reporter_profile_id: string
  profiles: { full_name: string | null; role: string } | null
  collaborations: {
    id: string
    brief: string
    status: string
    budget_cents: number | null
    paid_at: string | null
    creators: { display_name: string; profile_id: string } | null
    partners: { company_name: string; profile_id: string } | null
  } | null
}

/**
 * Reportes de solicitudes (spam, presupuesto poco serio...) y terminaciones por
 * incumplimiento — ver supabase/migrations/20261021140000_collaboration_offers_and_reports.sql
 * y 20261112120000_report_review_workflow.sql.
 * Sin policy de select para el cliente a propósito: esta es la única
 * forma de leerlos, con la service_role y detrás de la contraseña de admin.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('reports')
    .select('id, reason, detail, created_at, status, admin_note, resolved_at, reporter_profile_id, profiles(full_name, role), collaborations(id, brief, status, budget_cents, paid_at, creators(display_name, profile_id), partners(company_name, profile_id))')
    .order('created_at', { ascending: false })
    // Sin tope, esto traía TODOS los reportes desde el origen de los tiempos
    // en cada visita al panel — 500 ya es mucho más de lo que un equipo
    // pequeño revisa de una sentada (igual que el resto de /api/admin/*.get.ts).
    .limit(500)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const reports = (data as unknown as ReportRow[]).map((r) => {
    const c = r.collaborations
    // La otra parte: contra quién va el reporte.
    const reportedIsCreator = c?.partners?.profile_id === r.reporter_profile_id
    return {
      id: r.id,
      reason: r.reason,
      detail: r.detail,
      createdAt: r.created_at,
      status: r.status,
      adminNote: r.admin_note,
      resolvedAt: r.resolved_at,
      reporterName: r.profiles?.full_name ?? 'Sin nombre',
      reporterRole: r.profiles?.role ?? null,
      collaborationId: c?.id ?? null,
      collaborationBrief: c?.brief ?? null,
      collaborationStatus: c?.status ?? null,
      budgetCents: c?.budget_cents ?? null,
      paid: !!c?.paid_at,
      creatorName: c?.creators?.display_name ?? null,
      partnerName: c?.partners?.company_name ?? null,
      reportedName: (reportedIsCreator ? c?.creators?.display_name : c?.partners?.company_name) ?? null,
      reportedProfileId: (reportedIsCreator ? c?.creators?.profile_id : c?.partners?.profile_id) ?? null
    }
  })

  return { reports }
})

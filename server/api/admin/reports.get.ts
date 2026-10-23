import { serverSupabaseServiceRole } from '#supabase/server'

interface ReportRow {
  id: string
  reason: string
  detail: string | null
  created_at: string
  profiles: { full_name: string | null; role: string } | null
  collaborations: {
    brief: string
    creators: { display_name: string } | null
    partners: { company_name: string } | null
  } | null
}

/**
 * Reportes de solicitudes (spam, presupuesto poco serio...) — ver
 * supabase/migrations/20261021140000_collaboration_offers_and_reports.sql.
 * Sin policy de select para el cliente a propósito: esta es la única
 * forma de leerlos, con la service_role y detrás de la contraseña de admin.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)

  const { data, error } = await client
    .from('reports')
    .select('id, reason, detail, created_at, profiles(full_name, role), collaborations(brief, creators(display_name), partners(company_name))')
    .order('created_at', { ascending: false })
    // Sin tope, esto traía TODOS los reportes desde el origen de los tiempos
    // en cada visita al panel — 500 ya es mucho más de lo que un equipo
    // pequeño revisa de una sentada (igual que el resto de /api/admin/*.get.ts).
    .limit(500)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const reports = (data as unknown as ReportRow[]).map((r) => ({
    id: r.id,
    reason: r.reason,
    detail: r.detail,
    createdAt: r.created_at,
    reporterName: r.profiles?.full_name ?? 'Sin nombre',
    reporterRole: r.profiles?.role ?? null,
    collaborationBrief: r.collaborations?.brief ?? null,
    creatorName: r.collaborations?.creators?.display_name ?? null,
    partnerName: r.collaborations?.partners?.company_name ?? null
  }))

  return { reports }
})

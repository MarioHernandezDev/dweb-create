import { serverSupabaseServiceRole } from '#supabase/server'

interface Row {
  id: string; profile_id: string; reason: string | null; status: string; created_at: string; resolved_at: string | null
  assigned_to: string | null; assigned_name: string | null; name: string; role: string | null; email: string | null
}

/** Solicitudes de eliminación de cuenta (cuentas con historial de colaboraciones). Por defecto las pendientes, las más antiguas primero. Parámetros: status (pending|done|cancelled|all), page, pageSize. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const { page, pageSize, from, to } = pageParams(q, 20, 100)
  const client = serverSupabaseServiceRole(event)
  const status = typeof q.status === 'string' ? q.status : 'pending'

  let query = client.from('admin_deletion_requests_view').select('*', { count: 'exact' })
  if (status === 'pending' || status === 'done' || status === 'cancelled') query = query.eq('status', status)
  const { data, error, count } = await query.order('created_at', { ascending: status === 'pending' }).range(from, to)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const requests = ((data ?? []) as Row[]).map((r) => ({
    id: r.id, profileId: r.profile_id, reason: r.reason, status: r.status, createdAt: r.created_at, resolvedAt: r.resolved_at,
    assignedTo: r.assigned_to, assignedName: r.assigned_name, name: r.name, role: r.role, email: r.email
  }))
  return { requests, total: count ?? requests.length, page, pageSize }
})

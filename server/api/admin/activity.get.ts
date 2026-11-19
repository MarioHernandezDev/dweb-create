import { serverSupabaseServiceRole } from '#supabase/server'
import { applyActivityFilters } from '../../utils/admin-activity-query'

interface ActivityRow { type: string; created_at: string; profile_id: string | null; ref_id: string | null; summary: string }

/**
 * Historial de actividad (vista `admin_activity_view`): registros, colaboraciones, pagos, cancelaciones, terminaciones,
 * Pro, reportes, solicitudes de eliminación y acciones del propio equipo. Paginado y filtrable por tipo, texto,
 * cuenta y fechas. Parámetros: types, q, from, to, profile, page, pageSize.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const { page, pageSize, from, to } = pageParams(q, 30, 100)
  const client = serverSupabaseServiceRole(event)

  const query = applyActivityFilters(client.from('admin_activity_view').select('*', { count: 'exact' }), q)
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const events = ((data ?? []) as ActivityRow[]).map((e) => ({ type: e.type, summary: e.summary, createdAt: e.created_at, profileId: e.profile_id, refId: e.ref_id }))
  return { events, total: count ?? events.length, page, pageSize }
})

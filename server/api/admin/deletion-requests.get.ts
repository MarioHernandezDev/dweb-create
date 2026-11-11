import { serverSupabaseServiceRole } from '#supabase/server'

interface Row {
  id: string
  profile_id: string
  reason: string | null
  status: string
  created_at: string
  resolved_at: string | null
  profiles: { full_name: string | null; role: string } | null
}

/** Solicitudes de eliminación de cuenta pendientes de revisión (cuentas con historial de colaboraciones). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('account_deletion_requests')
    .select('id, profile_id, reason, status, created_at, resolved_at, profiles(full_name, role)')
    .order('created_at', { ascending: false }).limit(200)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return {
    requests: (data as unknown as Row[]).map((r) => ({
      id: r.id, profileId: r.profile_id, reason: r.reason, status: r.status, createdAt: r.created_at, resolvedAt: r.resolved_at,
      name: r.profiles?.full_name ?? 'Sin nombre', role: r.profiles?.role ?? null
    }))
  }
})

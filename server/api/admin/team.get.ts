import { serverSupabaseServiceRole } from '#supabase/server'

/** Personas del equipo con acceso al panel. Solo administración. Nunca devuelve el hash de la contraseña. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'admin')
  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('admin_members').select('id, email, name, role, active, created_at, last_login_at, created_by').order('created_at', { ascending: true })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return {
    members: ((data ?? []) as { id: string; email: string; name: string; role: string; active: boolean; created_at: string; last_login_at: string | null; created_by: string | null }[]).map((m) => ({
      id: m.id, email: m.email, name: m.name, role: m.role, active: m.active, createdAt: m.created_at, lastLoginAt: m.last_login_at, createdBy: m.created_by
    }))
  }
})

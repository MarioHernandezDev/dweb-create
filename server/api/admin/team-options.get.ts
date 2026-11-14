import { serverSupabaseServiceRole } from '#supabase/server'

/** Nombres de quienes pueden recibir asignaciones (moderación o administración, activos), para los desplegables de «Asignar a». */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('admin_members').select('id, name, role').eq('active', true).in('role', ['moderator', 'admin']).order('name', { ascending: true })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { members: (data ?? []) as { id: string; name: string; role: string }[] }
})

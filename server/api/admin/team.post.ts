import { serverSupabaseServiceRole } from '#supabase/server'
import { hashAdminPassword, validateMemberInput } from '../../utils/admin-roles'

/** Alta de una persona del equipo con su correo, rol y contraseña inicial (que luego puede cambiarle quien administra). Solo administración. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'admin')
  const parsed = validateMemberInput(await readBody(event))
  if (!parsed.ok) throw createError({ statusCode: 400, statusMessage: 'Datos no válidos', message: parsed.message })
  const { email, name, role, password } = parsed.value

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('admin_members')
    .insert({ email, name, role, password_hash: hashAdminPassword(password), created_by: actor.name } as never)
    .select('id').single<{ id: string }>()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Ya existe', message: 'Ya hay alguien del equipo con ese correo.' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  await logAdminAction(event, actor, { action: 'añadió a una persona al equipo', targetType: 'team', targetId: data.id, targetLabel: `${name} (${email})`, detail: { role } })
  return { ok: true, id: data.id }
})

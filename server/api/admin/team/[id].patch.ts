import { serverSupabaseServiceRole } from '#supabase/server'
import { hashAdminPassword, isAdminRole, validateAdminPassword } from '../../../utils/admin-roles'

/** Cambia el rol, activa o desactiva, o restablece la contraseña de alguien del equipo. No se puede uno cambiar a sí mismo el rol ni desactivarse. Solo administración. */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_RE.test(id)) throw createError({ statusCode: 400, statusMessage: 'Id no válido.' })
  const body = (await readBody<{ role?: unknown; active?: unknown; password?: unknown }>(event)) ?? {}

  const patch: Record<string, unknown> = {}
  const changes: string[] = []
  if (body.role !== undefined) {
    if (!isAdminRole(body.role)) throw createError({ statusCode: 400, statusMessage: 'Rol no válido.' })
    patch.role = body.role
    changes.push(`rol → ${body.role}`)
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'active debe ser true o false.' })
    patch.active = body.active
    changes.push(body.active ? 'reactivado' : 'desactivado')
  }
  if (body.password !== undefined) {
    const err = validateAdminPassword(body.password)
    if (err) throw createError({ statusCode: 400, statusMessage: 'Contraseña no válida', message: err })
    patch.password_hash = hashAdminPassword(body.password as string)
    changes.push('contraseña restablecida')
  }
  if (!changes.length) throw createError({ statusCode: 400, statusMessage: 'No hay nada que cambiar.' })
  if (id === actor.memberId && (patch.role !== undefined || patch.active === false)) {
    throw createError({ statusCode: 400, statusMessage: 'No puedes hacerlo contigo', message: 'No puedes cambiarte el rol ni desactivarte a ti mismo. Pídeselo a otra persona de administración.' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('admin_members').update(patch as never).eq('id', id).select('name, email').maybeSingle<{ name: string; email: string }>()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'No existe esa persona del equipo.' })
  await logAdminAction(event, actor, { action: 'cambió a una persona del equipo', targetType: 'team', targetId: id, targetLabel: `${data.name} (${data.email})`, detail: { cambios: changes } })
  return { ok: true }
})

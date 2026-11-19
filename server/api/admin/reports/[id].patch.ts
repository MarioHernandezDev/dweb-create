import { serverSupabaseServiceRole } from '#supabase/server'
import { isReportStatus, reviewUpdate } from '../../../utils/report-review'
import { resolveAssignee } from '../../../utils/admin-assign'

/**
 * Cambia el estado de revisión de un reporte, su nota interna y/o a quién está asignado. Moderación o más.
 * Al pasar a «en revisión» sin responsable, se asigna a quien lo coge (si entra con cuenta personal).
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'moderator')
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ status?: string; note?: string; assignedTo?: unknown }>(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Falta el id.' })

  const assignee = resolveAssignee(body?.assignedTo, actor.memberId)
  if (!assignee.ok) throw createError({ statusCode: 400, statusMessage: 'Asignación no válida', message: assignee.message })
  if (body?.status === undefined && assignee.skip) throw createError({ statusCode: 400, statusMessage: 'No hay nada que cambiar.' })
  if (body?.status !== undefined && !isReportStatus(body.status)) throw createError({ statusCode: 400, statusMessage: 'Estado no valido.' })

  const client = serverSupabaseServiceRole(event)
  const patch: Record<string, unknown> = {}
  if (body?.status !== undefined && isReportStatus(body.status)) {
    const update = reviewUpdate(body.status, body.note)
    if (!update.ok) throw createError({ statusCode: 400, statusMessage: 'Falta la nota', message: update.message })
    Object.assign(patch, update.patch)
    if (assignee.skip && body.status === 'reviewing' && actor.memberId) {
      const { data: cur } = await client.from('reports').select('assigned_to').eq('id', id).maybeSingle<{ assigned_to: string | null }>()
      if (cur && !cur.assigned_to) patch.assigned_to = actor.memberId
    }
  }
  if (!assignee.skip) patch.assigned_to = assignee.value

  const { data, error } = await client.from('reports').update(patch as never).eq('id', id).select('id, status, admin_note, resolved_at, assigned_to').maybeSingle<{ id: string; status: string; admin_note: string | null; resolved_at: string | null; assigned_to: string | null }>()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Reporte no encontrado.' })

  await logAdminAction(event, actor, {
    action: body?.status ? `pasó un reporte a «${body.status}»` : 'asignó un reporte', targetType: 'report', targetId: id,
    detail: { status: body?.status, assignedTo: assignee.skip ? undefined : assignee.value, note: body?.note ? String(body.note).slice(0, 200) : undefined }
  })
  const assignedName = data.assigned_to
    ? (await client.from('admin_members').select('name').eq('id', data.assigned_to).maybeSingle<{ name: string }>()).data?.name ?? null
    : null
  return { ok: true, status: data.status, admin_note: data.admin_note, resolved_at: data.resolved_at, assignedTo: data.assigned_to, assignedName }
})

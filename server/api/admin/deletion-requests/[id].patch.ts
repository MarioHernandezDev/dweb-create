import { serverSupabaseServiceRole } from '#supabase/server'
import { resolveAssignee } from '../../../utils/admin-assign'

/**
 * Atiende una solicitud de eliminación: 'done' (atendida), 'cancelled' (descartada) y/o asignarla a alguien del equipo. Moderación o más.
 * NO borra la cuenta: para eso está «Eliminar cuenta» en la ficha de la persona (administración), que al terminar la marca como atendida.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'moderator')
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ status?: string; assignedTo?: unknown }>(event)
  const assignee = resolveAssignee(body?.assignedTo, actor.memberId)
  if (!assignee.ok) throw createError({ statusCode: 400, statusMessage: 'Asignación no válida', message: assignee.message })
  const hasStatus = body?.status !== undefined
  if (!id || (hasStatus && body.status !== 'done' && body.status !== 'cancelled') || (!hasStatus && assignee.skip)) throw createError({ statusCode: 400, statusMessage: 'Estado no valido.' })

  const patch: Record<string, unknown> = {}
  if (hasStatus) Object.assign(patch, { status: body.status, resolved_at: new Date().toISOString() })
  if (!assignee.skip) patch.assigned_to = assignee.value

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('account_deletion_requests').update(patch as never).eq('id', id).select('id, profile_id').maybeSingle<{ id: string; profile_id: string }>()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Solicitud no encontrada.' })
  await logAdminAction(event, actor, {
    action: hasStatus ? (body.status === 'done' ? 'marcó como atendida una solicitud de eliminación' : 'descartó una solicitud de eliminación') : 'asignó una solicitud de eliminación',
    targetType: 'deletion_request', targetId: data.id, detail: { profileId: data.profile_id }
  })
  return { ok: true }
})

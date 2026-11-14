import { serverSupabaseServiceRole } from '#supabase/server'
import { reviewUpdate } from '../../../utils/report-review'
import { resolveAssignee } from '../../../utils/admin-assign'

const MAX_IDS = 100

/**
 * Acción en lote sobre reportes: review (pasar a revisión), dismiss (desestimar), resolve (resolver) o assign (asignar).
 * Desestimar y resolver exigen una nota común (mínimo 10 caracteres), igual que de uno en uno. Moderación o más.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'moderator')
  const body = await readBody<{ ids?: unknown; action?: unknown; note?: unknown; assignedTo?: unknown }>(event)
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.filter((i): i is string => typeof i === 'string' && UUID_RE.test(i)))] : []
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: 'Elige al menos un reporte.' })
  if (ids.length > MAX_IDS) throw createError({ statusCode: 400, statusMessage: 'Demasiados', message: `Como máximo ${MAX_IDS} reportes de una vez.` })

  const client = serverSupabaseServiceRole(event)
  const action = body.action
  let patch: Record<string, unknown>
  let label: string
  if (action === 'review' || action === 'dismiss' || action === 'resolve') {
    const status = action === 'review' ? 'reviewing' : action === 'dismiss' ? 'dismissed' : 'resolved'
    const update = reviewUpdate(status, body.note)
    if (!update.ok) throw createError({ statusCode: 400, statusMessage: 'Falta la nota', message: update.message })
    patch = { ...update.patch }
    // Pasar a revisión no pisa la nota que ya tuviera cada reporte.
    if (status === 'reviewing' && !body.note) delete patch.admin_note
    if (status === 'reviewing' && actor.memberId) patch.assigned_to = actor.memberId
    label = `pasó ${ids.length} reportes a «${status}»`
  } else if (action === 'assign') {
    const assignee = resolveAssignee(body.assignedTo === undefined ? null : body.assignedTo, actor.memberId)
    if (!assignee.ok) throw createError({ statusCode: 400, statusMessage: 'Asignación no válida', message: assignee.message })
    patch = { assigned_to: assignee.value }
    label = `asignó ${ids.length} reportes`
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Acción no válida.' })
  }

  const { data, error } = await client.from('reports').update(patch as never).in('id', ids).select('id')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await logAdminAction(event, actor, { action: label, targetType: 'report', detail: { ids: ids.length, action } })
  return { ok: true, updated: (data ?? []).length }
})

import { serverSupabaseServiceRole } from '#supabase/server'
import { isReportStatus, reviewUpdate } from '../../../utils/report-review'

/** Cambia el estado de revisión de un reporte y su nota interna. Solo el panel de admin. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ status?: string; note?: string }>(event)
  if (!id || !isReportStatus(body?.status)) throw createError({ statusCode: 400, statusMessage: 'Estado no valido.' })

  const update = reviewUpdate(body.status, body.note)
  if (!update.ok) throw createError({ statusCode: 400, statusMessage: 'Falta la nota', message: update.message })

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('reports').update(update.patch as never).eq('id', id).select('id').maybeSingle<{ id: string }>()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Reporte no encontrado.' })
  return { ok: true, ...update.patch }
})

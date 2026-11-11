import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Marca una solicitud de eliminación como atendida ('done') o la descarta ('cancelled').
 * NO borra la cuenta: el borrado o la anonimización se hacen siguiendo el procedimiento de
 * docs/14-OPERACIONES-ADMIN.md, y aquí solo queda constancia de que se hizo.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ status?: string }>(event)
  if (!id || (body?.status !== 'done' && body?.status !== 'cancelled')) throw createError({ statusCode: 400, statusMessage: 'Estado no valido.' })

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.from('account_deletion_requests')
    .update({ status: body.status, resolved_at: new Date().toISOString() } as never).eq('id', id).select('id').maybeSingle<{ id: string }>()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Solicitud no encontrada.' })
  return { ok: true }
})

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/** DELETE /api/account/delete — retira una solicitud de eliminación que sigue pendiente. */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'account', user.sub)

  const client = serverSupabaseServiceRole(event)
  const { error } = await client.from('account_deletion_requests')
    .update({ status: 'cancelled', resolved_at: new Date().toISOString() } as never).eq('profile_id', user.sub).eq('status', 'pending')
  if (error) throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se ha podido retirar la solicitud.' })
  return { ok: true }
})

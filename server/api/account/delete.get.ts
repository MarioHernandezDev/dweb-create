import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { loadDeletionBlockers } from '../../utils/account-deletion'

/**
 * GET /api/account/delete — qué colaboraciones abiertas impiden hoy eliminar la cuenta del usuario.
 * Devuelve `{ blockers: [...] }` (vacío si se puede eliminar). Solo lee; no borra nada.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'account', user.sub)

  const blockers = await loadDeletionBlockers(serverSupabaseServiceRole(event), user.sub)
  if (!blockers) throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se ha podido comprobar tus colaboraciones. Inténtalo de nuevo.' })
  return { blockers }
})

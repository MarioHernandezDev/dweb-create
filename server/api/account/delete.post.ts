import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { emailMatches, loadDeletionBlockers, planAccountDeletion } from '../../utils/account-deletion'

/**
 * POST /api/account/delete — el usuario pide eliminar SU cuenta.
 * Hay que escribir el email de la cuenta para confirmar. Ver las reglas en
 * server/utils/account-deletion.ts. Devuelve qué ha pasado:
 *   { status: 'deleted' }    la cuenta ya no existe
 *   { status: 'requested' }  queda pendiente de revisión (hay historial compartido)
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'account', user.sub)

  const body = await readBody<{ confirmEmail?: string; reason?: string }>(event)
  if (!emailMatches(body?.confirmEmail, user.email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email incorrecto', message: 'El email no coincide con el de tu cuenta.' })
  }
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null

  const client = serverSupabaseServiceRole(event)
  const [{ data: creator }, { data: partner }] = await Promise.all([
    client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>(),
    client.from('partners').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  ])

  const statuses: string[] = []
  for (const [column, id] of [['creator_id', creator?.id], ['partner_id', partner?.id]] as const) {
    if (!id) continue
    const { data, error } = await client.from('collaborations').select('status').eq(column, id)
    if (error) throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se ha podido comprobar tus colaboraciones. Inténtalo de nuevo.' })
    statuses.push(...((data ?? []) as { status: string }[]).map((r) => r.status))
  }

  const plan = planAccountDeletion(statuses)
  if (plan === 'blocked') {
    const blockers = await loadDeletionBlockers(client, user.sub)
    throw createError({
      statusCode: 409, statusMessage: 'Colaboraciones abiertas',
      message: 'Tienes colaboraciones abiertas o solicitudes pendientes. Ciérralas o cancélalas antes de eliminar la cuenta.',
      data: { blockers: blockers ?? [] }
    })
  }

  if (plan === 'delete_now') {
    const { error } = await client.auth.admin.deleteUser(user.sub)
    if (!error) return { status: 'deleted' as const }
    // Si el borrado directo falla (alguna referencia que lo impide), no se pierde la petición: pasa a revisión.
    console.error('[cuenta] borrado directo fallido, pasa a solicitud:', error.message)
  }

  const { error: reqError } = await client.from('account_deletion_requests')
    .upsert({ profile_id: user.sub, reason, status: 'pending', created_at: new Date().toISOString(), resolved_at: null } as never, { onConflict: 'profile_id' })
  if (reqError) throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se ha podido registrar la solicitud. Inténtalo de nuevo.' })
  // Mientras se revisa, la ficha deja de verse sin sesión.
  await client.from('profiles').update({ public_profile_enabled: false } as never).eq('id', user.sub)

  return { status: 'requested' as const }
})

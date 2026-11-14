import { serverSupabaseServiceRole } from '#supabase/server'
import { randomBytes } from 'node:crypto'
import { collaborationStatusesFor, loadDeletionBlockers } from '../../../../utils/account-deletion'
import { anonymizedEmail, decideRemoval } from '../../../../utils/admin-account-removal'

const BUCKETS = ['post-media', 'collab-files'] as const

/** Borra los archivos de la cuenta en el almacenamiento (carpeta con su id). Mejor esfuerzo: si falla, se avisa pero no se frena la eliminación. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function removeStorageFolders(client: any, profileId: string): Promise<number> {
  let removed = 0
  for (const bucket of BUCKETS) {
    try {
      const { data } = await client.storage.from(bucket).list(profileId, { limit: 1000 })
      const paths = ((data ?? []) as { name: string; id: string | null }[]).filter((f) => f.id).map((f) => `${profileId}/${f.name}`)
      if (paths.length) {
        const { error } = await client.storage.from(bucket).remove(paths)
        if (!error) removed += paths.length
      }
    } catch (e) {
      console.error(`[admin] no se pudo limpiar ${bucket}:`, (e as Error).message)
    }
  }
  return removed
}

/**
 * POST /api/admin/users/:id/delete — elimina una cuenta desde el panel (solo administración).
 *  { mode: 'delete' | 'anonymize', confirmEmail, acknowledgeSharedHistory?, reason? }
 *  - delete: borra el login y, en cascada, todos sus datos (y los archivos de su carpeta).
 *  - anonymize: vacía sus datos personales, bloquea el acceso y conserva el registro compartido con la otra parte.
 * Si había una solicitud de eliminación de esa persona, queda marcada como atendida. Todo queda en el registro de auditoría.
 */
export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_RE.test(id)) throw createError({ statusCode: 400, statusMessage: 'Id de usuario no válido.' })
  const body = (await readBody<{ mode?: unknown; confirmEmail?: unknown; acknowledgeSharedHistory?: unknown; reason?: unknown }>(event)) ?? {}

  const client = serverSupabaseServiceRole(event)
  const { data: found, error: userError } = await client.auth.admin.getUserById(id)
  if (userError || !found?.user) throw createError({ statusCode: 404, statusMessage: 'No existe esa cuenta.' })
  const email = found.user.email ?? null

  const statuses = await collaborationStatusesFor(client, id)
  if (!statuses) throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se han podido comprobar las colaboraciones de la cuenta.' })

  const decision = decideRemoval({ mode: body.mode, confirmEmail: body.confirmEmail, accountEmail: email, statuses, acknowledgeSharedHistory: body.acknowledgeSharedHistory })
  if (!decision.ok) {
    const status = decision.code === 'blocked' || decision.code === 'needs_acknowledge' ? 409 : 400
    throw createError({
      statusCode: status, statusMessage: 'No se puede eliminar', message: decision.message,
      data: { code: decision.code, blockers: decision.code === 'blocked' ? ((await loadDeletionBlockers(client, id)) ?? []) : undefined }
    })
  }

  const label = await accountLabel(event, id)
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) || null : null
  const sharedHistory = statuses.length > 0

  if (body.mode === 'anonymize') {
    const { data, error } = await client.rpc('admin_anonymize_account' as never, { p_profile_id: id } as never)
    if (error) throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se han podido vaciar los datos de la cuenta.' })
    // Sin acceso: correo imposible, contraseña aleatoria, bloqueada y sin datos de usuario.
    const { error: authError } = await client.auth.admin.updateUserById(id, {
      email: anonymizedEmail(id), password: randomBytes(32).toString('base64url'), email_confirm: true, user_metadata: {}, ban_duration: '876000h'
    })
    if (authError) {
      await logAdminAction(event, actor, { action: 'anonimizó los datos de una cuenta (el bloqueo del acceso falló)', targetType: 'user', targetId: id, targetLabel: label, detail: { error: authError.message } })
      throw createError({ statusCode: 500, statusMessage: 'Error', message: 'Se vaciaron los datos, pero no se pudo bloquear el acceso. Bloquéala desde su ficha.' })
    }
    const removed = await removeStorageFolders(client, id)
    await client.from('account_deletion_requests').update({ status: 'done', resolved_at: new Date().toISOString() } as never).eq('profile_id', id).eq('status', 'pending')
    await logAdminAction(event, actor, { action: 'anonimizó una cuenta', targetType: 'user', targetId: id, targetLabel: label, detail: { reason, sharedHistory, archivosBorrados: removed, ...(data as Record<string, unknown>) } })
    return { status: 'anonymized' as const }
  }

  // `collaborations.creator_id` es NOT NULL pero su clave foránea es SET NULL: borrar a un creador con colaboraciones
  // falla en la base. Por eso, con historial compartido, las colaboraciones de la cuenta se borran antes (con sus
  // chats, cronología y valoraciones en cascada), que es justo lo que la confirmación avisa.
  let collabsRemoved = 0
  if (sharedHistory) {
    const [{ data: creator }, { data: partner }] = await Promise.all([
      client.from('creators').select('id').eq('profile_id', id).maybeSingle<{ id: string }>(),
      client.from('partners').select('id').eq('profile_id', id).maybeSingle<{ id: string }>()
    ])
    for (const [column, sideId] of [['creator_id', creator?.id], ['partner_id', partner?.id]] as const) {
      if (!sideId) continue
      const { data, error: delError } = await client.from('collaborations').delete().eq(column, sideId).select('id')
      if (delError) {
        await logAdminAction(event, actor, { action: 'intentó borrar una cuenta y falló al quitar sus colaboraciones', targetType: 'user', targetId: id, targetLabel: label, detail: { error: delError.message } })
        throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se han podido quitar las colaboraciones de la cuenta. No se ha borrado nada más; prueba a anonimizarla.' })
      }
      collabsRemoved += (data ?? []).length
    }
  }
  const removed = await removeStorageFolders(client, id)
  const { error } = await client.auth.admin.deleteUser(id)
  if (error) {
    await logAdminAction(event, actor, { action: 'intentó borrar una cuenta y falló', targetType: 'user', targetId: id, targetLabel: label, detail: { error: error.message } })
    throw createError({ statusCode: 500, statusMessage: 'Error', message: 'No se ha podido borrar la cuenta (puede haber datos que la referencian). Prueba a anonimizarla.' })
  }
  await logAdminAction(event, actor, { action: 'borró una cuenta', targetType: 'user', targetId: id, targetLabel: label, detail: { reason, sharedHistory, colaboracionesBorradas: collabsRemoved, archivosBorrados: removed } })
  return { status: 'deleted' as const }
})

import { serverSupabaseServiceRole } from '#supabase/server'
import { type PendingNotification, emailWindow, groupForEmail } from '../../utils/notification-email'
import { notificationDigestMail } from '../../utils/mail-templates'

/**
 * POST /api/notifications/email-dispatch — manda por correo los avisos sin leer.
 *
 * Igual que /api/social/sync-all: no sabe quién la llama, solo exige
 * `Authorization: Bearer <SYNC_CRON_SECRET>`. Pensada para un cron cada 10-15 min.
 * Hoy NO hay ningún cron que la invoque (se decide con el despliegue).
 *
 *  - Sin SMTP configurado responde `skipped` y NO marca nada (no se pierden avisos).
 *  - Solo avisos sin leer, de entre 10 min y 24 h, aún no enviados: un correo por
 *    persona con todos los suyos. Quien desactivó el correo en Ajustes no recibe nada.
 *  - Se marca `emailed_at` solo tras un envío correcto (o si el destinatario no
 *    tiene correo válido / lo desactivó). Si falla, se reintenta en la siguiente pasada.
 *  - Un fallo de credenciales corta la pasada: no tiene sentido seguir intentando.
 *  - Devuelve y registra solo recuentos y códigos, nunca correos ni contenido.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.syncCronSecret) throw createError({ statusCode: 503, statusMessage: 'El envio programado no esta configurado.' })
  if (!verifyCronSecret(getHeader(event, 'authorization'), config.syncCronSecret)) {
    const failures = checkRateLimit(`email-dispatch-fail:${clientIp(event)}`, 5, 10 * 60_000)
    if (!failures.allowed) {
      setResponseHeader(event, 'Retry-After', failures.retryAfterSeconds)
      throw createError({ statusCode: 429, statusMessage: 'Demasiados intentos.' })
    }
    throw createError({ statusCode: 401, statusMessage: 'No autorizado.' })
  }
  const run = checkRateLimit('email-dispatch-run', 1, 60_000)
  if (!run.allowed) {
    setResponseHeader(event, 'Retry-After', run.retryAfterSeconds)
    throw createError({ statusCode: 429, statusMessage: 'Ya se ha lanzado hace menos de un minuto.' })
  }

  if (!mailSettings(event).ok) return { skipped: true, reason: 'mail_not_configured' }

  const client = serverSupabaseServiceRole(event)
  const window = emailWindow(new Date())
  const { data, error } = await client
    .from('notifications' as never)
    .select('id, profile_id, title, body, link, created_at')
    .is('read_at', null)
    .is('emailed_at', null)
    .lt('created_at', window.olderThan)
    .gt('created_at', window.newerThan)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw createError({ statusCode: 500, statusMessage: 'No se han podido leer los avisos pendientes.' })
  const rows = (data ?? []) as unknown as PendingNotification[]
  if (!rows.length) return { skipped: false, recipients: 0, sent: 0, failed: 0, suppressed: 0 }

  const profileIds = [...new Set(rows.map((r) => r.profile_id))]
  const { data: prefs } = await client.from('notification_preferences' as never).select('profile_id, email_enabled').in('profile_id', profileIds)
  const optedOut = new Set(((prefs ?? []) as unknown as { profile_id: string; email_enabled: boolean }[]).filter((p) => p.email_enabled === false).map((p) => p.profile_id))
  const { batches, suppressedIds } = groupForEmail(rows, optedOut)

  const markEmailed = async (ids: string[]) => {
    if (ids.length) await client.from('notifications' as never).update({ emailed_at: new Date().toISOString() } as never).in('id', ids)
  }
  await markEmailed(suppressedIds)

  let sent = 0
  let failed = 0
  let noAddress = 0
  let aborted: string | null = null
  for (const batch of batches) {
    const { data: userData } = await client.auth.admin.getUserById(batch.profileId)
    const to = userData?.user?.email
    if (!to || !userData.user?.email_confirmed_at) {
      noAddress++
      await markEmailed(batch.ids)
      continue
    }
    const mail = notificationDigestMail(batch.items, config.appUrl)
    const result = await sendMail({ to, ...mail }, event)
    if (result.ok) {
      sent++
      await markEmailed(batch.ids)
    } else if (result.skipped) {
      noAddress++
      await markEmailed(batch.ids)
    } else {
      failed++
      if (result.code === 'auth' || result.code === 'tls') { aborted = result.code; break }
      if (result.code === 'rejected') await markEmailed(batch.ids)
    }
  }

  const summary = { skipped: false, recipients: batches.length, sent, failed, noAddress, suppressed: suppressedIds.length, aborted }
  console.info('[mail] avisos por correo', JSON.stringify(summary))
  return summary
})

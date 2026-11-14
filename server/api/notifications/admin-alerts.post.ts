import { adminAlertsMail } from '../../utils/mail-templates'
import { loadAdminOverview } from '../../utils/admin-overview'

/**
 * POST /api/notifications/admin-alerts — avisa por correo al equipo si hay alertas del panel
 * (reportes o solicitudes de eliminación sin atender, picos, cuentas con varios reportes).
 * Igual que email-dispatch: solo exige `Authorization: Bearer <SYNC_CRON_SECRET>`; pensada para un cron cada pocas horas.
 * Sin ADMIN_ALERT_EMAIL o sin SMTP responde `skipped`. Sin alertas no envía nada. Hoy no hay ningún cron que la llame.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.syncCronSecret) throw createError({ statusCode: 503, statusMessage: 'El envio programado no esta configurado.' })
  if (!verifyCronSecret(getHeader(event, 'authorization'), config.syncCronSecret)) {
    const failures = checkRateLimit(`admin-alerts-fail:${clientIp(event)}`, 5, 10 * 60_000)
    if (!failures.allowed) {
      setResponseHeader(event, 'Retry-After', failures.retryAfterSeconds)
      throw createError({ statusCode: 429, statusMessage: 'Demasiados intentos.' })
    }
    throw createError({ statusCode: 401, statusMessage: 'No autorizado.' })
  }
  const run = checkRateLimit('admin-alerts-run', 1, 60_000)
  if (!run.allowed) {
    setResponseHeader(event, 'Retry-After', run.retryAfterSeconds)
    throw createError({ statusCode: 429, statusMessage: 'Ya se ha lanzado hace menos de un minuto.' })
  }

  const to = (config.adminAlertEmail as string | undefined)?.trim()
  if (!to) return { skipped: true, reason: 'no_alert_email' }
  if (!mailSettings(event).ok) return { skipped: true, reason: 'mail_not_configured' }

  const { alerts } = await loadAdminOverview(event)
  if (!alerts.length) return { sent: false, alerts: 0 }
  const result = await sendMail({ to, ...adminAlertsMail(alerts.map((a) => ({ title: a.title, detail: a.detail })), config.appUrl) }, event)
  return { sent: result.ok, alerts: alerts.length }
})
